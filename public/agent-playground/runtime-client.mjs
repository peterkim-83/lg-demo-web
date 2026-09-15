export const AGENT_RUNTIME_BASE_URL = 'https://api.peter-n8n.duckdns.org';
export const AGENT_RUNTIME_TIMEOUT_MS = 90_000;

export const AGENT_RUNTIME_ENDPOINTS = Object.freeze({
  capabilities: '/v1/agent/capabilities',
  models: '/v1/agent/models',
  outputSchemas: '/v1/agent/output-schemas',
  outputSchema: (schemaId) => `/v1/agent/output-schemas/${encodeURIComponent(normalizeRegistryId(schemaId))}`,
  toolProfiles: '/v1/agent/tool-profiles',
  toolProfile: (profileId) => `/v1/agent/tool-profiles/${encodeURIComponent(normalizeRegistryId(profileId))}`,
  run: '/v1/agent/run',
  runs: '/v1/agent/runs',
  observableRun: (runId) => `/v1/agent/runs/${encodeURIComponent(normalizeRunId(runId))}`,
  observableRunEvents: (runId) => `/v1/agent/runs/${encodeURIComponent(normalizeRunId(runId))}/events`,
  cancelObservableRun: (runId) => `/v1/agent/runs/${encodeURIComponent(normalizeRunId(runId))}/cancel`
});

export const PUBLIC_AGENT_EVENT_TYPES = Object.freeze([
  'run.queued',
  'run.started',
  'turn.started',
  'tool.started',
  'tool.progress',
  'tool.completed',
  'tool.failed',
  'output.received',
  'output.validating',
  'output.validated',
  'run.completed',
  'run.failed',
  'run.cancelled'
]);

const PUBLIC_EVENT_TYPE_SET = new Set(PUBLIC_AGENT_EVENT_TYPES);
const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const PUBLIC_ERROR_MESSAGES = Object.freeze({
  400: 'The runtime rejected this request. Review the selected contract and mission.',
  401: 'Your Firebase session is no longer authorized. Sign in again and retry.',
  403: 'This account does not have permission to use the agent runtime.',
  404: 'The requested runtime asset or run no longer exists.',
  408: 'The agent runtime timed out before completing this request.',
  409: 'The runtime could not apply this operation in the current run state.',
  422: 'The runtime rejected the request contract. Review the mission and selected assets.',
  429: 'The runtime is busy. Wait a moment, then try again.'
});

export class AgentRuntimeError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'AgentRuntimeError';
    this.code = code;
    this.status = status;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeIdentifier(value, code) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.length > 256) throw new AgentRuntimeError(code, 'The runtime identifier is invalid.');
  return normalized;
}

function normalizeRegistryId(value) {
  return normalizeIdentifier(value, 'registry_id_invalid');
}

function normalizeRunId(value) {
  return normalizeIdentifier(value, 'run_id_invalid');
}

function optionalIdentifier(value, code) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized.length > 256) throw new AgentRuntimeError(code, 'The selected runtime asset identifier is invalid.');
  return normalized;
}

export function createAgentRequest(input, sessionId = '', options = {}) {
  const normalizedInput = String(input || '').trim();
  if (!normalizedInput) throw new AgentRuntimeError('input_required', 'Enter a mission before running the agent.');
  if (normalizedInput.length > 100_000) throw new AgentRuntimeError('input_too_large', 'The mission exceeds the runtime input limit.');

  const payload = { input: normalizedInput };
  const normalizedSessionId = optionalIdentifier(sessionId, 'session_id_invalid');
  const outputSchemaId = optionalIdentifier(options.outputSchemaId, 'output_schema_id_invalid');
  const toolProfileId = optionalIdentifier(options.toolProfileId, 'tool_profile_id_invalid');
  if (normalizedSessionId) payload.session_id = normalizedSessionId;
  if (outputSchemaId) payload.output_schema_id = outputSchemaId;
  if (toolProfileId) payload.tool_profile_id = toolProfileId;
  return payload;
}

function messageForStatus(status) {
  if (PUBLIC_ERROR_MESSAGES[status]) return PUBLIC_ERROR_MESSAGES[status];
  if (status >= 500) return 'The Agent Runtime reported a server failure. Try again in a moment.';
  return 'The Agent Runtime could not complete this request.';
}

function errorCodeForStatus(status) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 408) return 'timeout';
  if (status === 409) return 'conflict';
  if (status === 422) return 'invalid_contract';
  return 'runtime_failure';
}

function normalizeCompletedResponse(value) {
  if (!isPlainObject(value)) throw new AgentRuntimeError('invalid_response', 'The runtime returned an unreadable response.');
  if (String(value.status || '').toLowerCase() !== 'completed') {
    throw new AgentRuntimeError('runtime_failure', 'The Agent Runtime did not complete this turn.');
  }
  const sessionId = String(value.session_id || '').trim();
  const outputIsValid = typeof value.output === 'string' || isPlainObject(value.output);
  if (!sessionId || !outputIsValid) {
    throw new AgentRuntimeError('invalid_response', 'The runtime response is missing required session or output data.');
  }
  return {
    status: 'completed',
    runtime: String(value.runtime || 'codex').trim().toLowerCase() || 'codex',
    session_id: sessionId,
    turn_id: String(value.turn_id || '').trim(),
    output_schema_id: String(value.output_schema_id || '').trim(),
    output: value.output,
    duration_ms: normalizeOptionalNumber(value.duration_ms)
  };
}

function normalizeRegistryList(value, kind) {
  if (!isPlainObject(value) || !Array.isArray(value.items)) {
    throw new AgentRuntimeError('invalid_response', `The ${kind} registry returned an unreadable response.`);
  }
  return value.items.filter(isPlainObject).map((item) => ({
    id: String(item.id || '').trim(),
    version: String(item.version || '').trim(),
    profile: String(item.profile || '').trim(),
    description: String(item.description || '').trim()
  })).filter((item) => item.id);
}

function normalizeModelCatalog(value) {
  if (!isPlainObject(value) || !Array.isArray(value.items) || typeof value.source !== 'string' || typeof value.refreshed_at !== 'string') {
    throw new AgentRuntimeError('invalid_response', 'The model registry returned an unreadable response.');
  }

  const modelIds = new Set();
  const items = value.items.map((item) => {
    if (!isPlainObject(item)
      || typeof item.id !== 'string'
      || typeof item.display_name !== 'string'
      || typeof item.description !== 'string'
      || typeof item.is_default !== 'boolean'
      || typeof item.default_reasoning_effort !== 'string'
      || !Array.isArray(item.supported_reasoning_efforts)) {
      throw new AgentRuntimeError('invalid_response', 'The model registry contains an unreadable model.');
    }

    const id = item.id.trim();
    const displayName = item.display_name.trim();
    const defaultReasoningEffort = item.default_reasoning_effort.trim();
    if (!id || id.length > 256 || !displayName || !defaultReasoningEffort || modelIds.has(id)) {
      throw new AgentRuntimeError('invalid_response', 'The model registry contains an invalid or duplicate model identifier.');
    }
    modelIds.add(id);

    const effortIds = new Set();
    const supportedReasoningEfforts = item.supported_reasoning_efforts.map((effort) => {
      if (!isPlainObject(effort) || typeof effort.id !== 'string' || typeof effort.description !== 'string') {
        throw new AgentRuntimeError('invalid_response', 'The model registry contains an unreadable reasoning effort.');
      }
      const effortId = effort.id.trim();
      if (!effortId || effortId.length > 256 || effortIds.has(effortId)) {
        throw new AgentRuntimeError('invalid_response', 'The model registry contains an invalid or duplicate reasoning effort.');
      }
      effortIds.add(effortId);
      return { id: effortId, description: effort.description.trim() };
    });

    if (!effortIds.has(defaultReasoningEffort)) {
      throw new AgentRuntimeError('invalid_response', 'A model default reasoning effort is not included in its supported efforts.');
    }

    return {
      id,
      display_name: displayName,
      description: item.description.trim(),
      is_default: item.is_default,
      default_reasoning_effort: defaultReasoningEffort,
      supported_reasoning_efforts: supportedReasoningEfforts
    };
  });

  return {
    items,
    source: value.source.trim(),
    refreshed_at: value.refreshed_at.trim()
  };
}

export function resolveModelRegistrySelection(catalog, persistedModelId = '', persistedReasoningEffort = '') {
  const items = Array.isArray(catalog?.items) ? catalog.items : [];
  const preferredModelId = String(persistedModelId || '').trim();
  const preferredReasoningEffort = String(persistedReasoningEffort || '').trim();
  const noticeCodes = [];

  if (!items.length) {
    return Object.freeze({
      selectedModelId: '', selectedReasoningEffort: '', modelSource: 'none', reasoningEffortSource: 'none',
      noticeCodes: Object.freeze(noticeCodes), errorCode: 'empty_catalog'
    });
  }

  let model = items.find((item) => item.id === preferredModelId) || null;
  let modelSource = 'persisted';
  if (!model) {
    if (preferredModelId) noticeCodes.push('persisted_model_missing');
    const defaults = items.filter((item) => item.is_default === true);
    if (defaults.length !== 1) {
      return Object.freeze({
        selectedModelId: '', selectedReasoningEffort: '', modelSource: 'none', reasoningEffortSource: 'none',
        noticeCodes: Object.freeze(noticeCodes), errorCode: defaults.length ? 'default_model_ambiguous' : 'default_model_missing'
      });
    }
    model = defaults[0];
    modelSource = 'backend_default';
  }

  const supported = model.supported_reasoning_efforts || [];
  const persistedEffortIsValid = supported.some((effort) => effort.id === preferredReasoningEffort);
  const selectedReasoningEffort = persistedEffortIsValid ? preferredReasoningEffort : model.default_reasoning_effort;
  if (preferredReasoningEffort && !persistedEffortIsValid) noticeCodes.push('persisted_effort_unsupported');

  return Object.freeze({
    selectedModelId: model.id,
    selectedReasoningEffort,
    modelSource,
    reasoningEffortSource: persistedEffortIsValid ? 'persisted' : 'backend_default',
    noticeCodes: Object.freeze(noticeCodes),
    errorCode: ''
  });
}

function normalizeRunSnapshot(value) {
  if (!isPlainObject(value)) throw new AgentRuntimeError('invalid_response', 'The observable run returned an unreadable response.');
  const runId = String(value.run_id || '').trim();
  const status = String(value.status || '').trim().toLowerCase();
  if (!runId || !status) throw new AgentRuntimeError('invalid_response', 'The observable run response is missing required identifiers.');
  return {
    run_id: runId,
    status,
    runtime: String(value.runtime || 'codex').trim().toLowerCase() || 'codex',
    session_id: String(value.session_id || '').trim(),
    turn_id: String(value.turn_id || '').trim(),
    output_schema_id: String(value.output_schema_id || '').trim(),
    tool_profile_id: String(value.tool_profile_id || '').trim(),
    output: typeof value.output === 'string' || isPlainObject(value.output) ? value.output : null,
    duration_ms: normalizeOptionalNumber(value.duration_ms),
    error: isPlainObject(value.error) ? {
      code: String(value.error.code || '').trim(),
      message: String(value.error.message || '').trim()
    } : null,
    created_at: String(value.created_at || '').trim(),
    started_at: String(value.started_at || '').trim(),
    completed_at: String(value.completed_at || '').trim()
  };
}

function firstString(source, keys) {
  for (const key of keys) {
    if (typeof source?.[key] === 'string' && source[key].trim()) return source[key].trim().slice(0, 500);
  }
  return '';
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : null;
}

function firstFiniteNumber(source, keys) {
  for (const key of keys) {
    const value = normalizeOptionalNumber(source?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function firstBoolean(source, keys) {
  for (const key of keys) if (typeof source?.[key] === 'boolean') return source[key];
  return null;
}

function normalizeArgumentKeys(payload) {
  const candidate = payload?.argument_keys ?? payload?.arguments?.keys ?? payload?.argument_metadata?.keys;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim().slice(0, 120)).slice(0, 50);
}

export function projectPublicAgentRunEvent({ event = '', id = '', data } = {}) {
  const envelope = isPlainObject(data) ? data : {};
  const payload = isPlainObject(envelope.payload) ? envelope.payload : isPlainObject(envelope.data) ? envelope.data : envelope;
  const type = firstString(envelope, ['type', 'event_type', 'event']) || String(event || '').trim();
  if (!PUBLIC_EVENT_TYPE_SET.has(type)) return null;
  const argumentKeys = normalizeArgumentKeys(payload);
  const argumentCount = firstFiniteNumber(payload, ['argument_count', 'argument_key_count']) ?? (argumentKeys.length || null);

  return Object.freeze({
    id: String(id || envelope.event_id || '').trim().slice(0, 500),
    type,
    timestamp: firstString(envelope, ['timestamp', 'occurred_at', 'created_at']),
    sequence: firstFiniteNumber(envelope, ['sequence', 'seq']),
    runId: firstString(envelope, ['run_id']) || firstString(payload, ['run_id']),
    toolServer: firstString(payload, ['tool_server', 'server', 'mcp_server']),
    toolName: firstString(payload, ['tool_name', 'name', 'tool']),
    argumentKeys,
    argumentCount,
    success: firstBoolean(payload, ['success', 'validated', 'valid']),
    durationMs: firstFiniteNumber(payload, ['duration_ms']),
    status: firstString(payload, ['status', 'run_status', 'validation_status']),
    schemaId: firstString(payload, ['output_schema_id', 'schema_id'])
  });
}

export function parseAgentRunEventFrame(frame) {
  const lines = String(frame || '').replace(/\r\n/g, '\n').split('\n');
  let event = '';
  let id = '';
  const dataLines = [];
  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator >= 0 ? line.slice(0, separator) : line;
    let value = separator >= 0 ? line.slice(separator + 1) : '';
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'id') id = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (!dataLines.length && !event) return null;
  let data = {};
  if (dataLines.length) {
    try { data = JSON.parse(dataLines.join('\n')); } catch (_) { return null; }
  }
  return projectPublicAgentRunEvent({ event, id, data });
}

export function isTerminalRunStatus(status) {
  return TERMINAL_RUN_STATUSES.has(String(status || '').trim().toLowerCase());
}

export function createAgentRuntimeClient({
  baseUrl = AGENT_RUNTIME_BASE_URL,
  fetchImpl = globalThis.fetch,
  getIdToken,
  timeoutMs = AGENT_RUNTIME_TIMEOUT_MS
} = {}) {
  if (typeof fetchImpl !== 'function' || typeof getIdToken !== 'function') {
    throw new TypeError('agent_runtime_dependencies_required');
  }
  const normalizedBaseUrl = new URL(baseUrl);
  if (normalizedBaseUrl.protocol !== 'https:' && normalizedBaseUrl.hostname !== '127.0.0.1' && normalizedBaseUrl.hostname !== 'localhost') {
    throw new TypeError('agent_runtime_https_required');
  }

  const resolve = (path) => new URL(path, normalizedBaseUrl).toString();

  async function authenticatedFetch(path, options = {}, forceRefresh = false) {
    const token = await getIdToken(forceRefresh);
    if (!String(token || '').trim()) throw new AgentRuntimeError('auth_missing', 'Sign in with Firebase before using the runtime.', 401);
    const headers = {
      Accept: options.accept || 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    };
    if (options.bodyJson !== undefined) headers['Content-Type'] = 'application/json';

    try {
      return await fetchImpl(resolve(path), {
        method: options.method || 'GET',
        headers,
        credentials: 'omit',
        cache: 'no-store',
        signal: options.signal,
        body: options.bodyJson !== undefined ? JSON.stringify(options.bodyJson) : undefined
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw new AgentRuntimeError('unreachable', 'The Agent Runtime is unreachable. Check the connection and try again.');
    }
  }

  async function request(path, options = {}) {
    const controller = options.signal ? null : new AbortController();
    const signal = options.signal || controller.signal;
    const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs || timeoutMs) : null;
    try {
      let response = await authenticatedFetch(path, { ...options, signal }, false);
      if (response.status === 401) response = await authenticatedFetch(path, { ...options, signal }, true);
      if (!response.ok) throw new AgentRuntimeError(errorCodeForStatus(response.status), messageForStatus(response.status), response.status);
      if (options.response === 'raw') return response;
      try { return await response.json(); } catch (_) {
        throw new AgentRuntimeError('invalid_response', 'The runtime returned an unreadable response.', response.status);
      }
    } catch (error) {
      if (error?.name === 'AbortError' && controller) {
        throw new AgentRuntimeError('timeout', `The runtime did not respond within ${Math.round((options.timeoutMs || timeoutMs) / 1000)} seconds.`, 408);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function streamRunEvents(runId, { signal, lastEventId = '', onEvent, onOpen } = {}) {
    const headers = {};
    if (lastEventId) headers['Last-Event-ID'] = String(lastEventId);
    const response = await request(AGENT_RUNTIME_ENDPOINTS.observableRunEvents(runId), {
      accept: 'text/event-stream',
      headers,
      response: 'raw',
      signal
    });
    const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
    if (!contentType.startsWith('text/event-stream') || !response.body?.getReader) {
      throw new AgentRuntimeError('sse_unavailable', 'The runtime event stream is unavailable.');
    }
    if (typeof onOpen === 'function') onOpen();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n');
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      for (const frame of frames) {
        const projected = parseAgentRunEventFrame(frame);
        if (projected && typeof onEvent === 'function') onEvent(projected);
      }
      if (done) break;
    }
    const projected = parseAgentRunEventFrame(buffer);
    if (projected && typeof onEvent === 'function') onEvent(projected);
  }

  return Object.freeze({
    async getCapabilities() {
      const value = await request(AGENT_RUNTIME_ENDPOINTS.capabilities);
      if (!isPlainObject(value) || !isPlainObject(value.runtime) || !isPlainObject(value.features)) {
        throw new AgentRuntimeError('invalid_response', 'The capability contract is unreadable.');
      }
      return value;
    },
    async getModelCatalog() {
      return normalizeModelCatalog(await request(AGENT_RUNTIME_ENDPOINTS.models));
    },
    async listOutputSchemas() {
      return normalizeRegistryList(await request(AGENT_RUNTIME_ENDPOINTS.outputSchemas), 'output schema');
    },
    async getOutputSchema(schemaId) {
      const value = await request(AGENT_RUNTIME_ENDPOINTS.outputSchema(schemaId));
      if (!isPlainObject(value) || !isPlainObject(value.json_schema)) throw new AgentRuntimeError('invalid_response', 'The output schema contract is unreadable.');
      return value;
    },
    async listToolProfiles() {
      return normalizeRegistryList(await request(AGENT_RUNTIME_ENDPOINTS.toolProfiles), 'tool profile');
    },
    async getToolProfile(profileId) {
      const value = await request(AGENT_RUNTIME_ENDPOINTS.toolProfile(profileId));
      if (!isPlainObject(value) || !Array.isArray(value.mcp_servers) || !isPlainObject(value.policy)) {
        throw new AgentRuntimeError('invalid_response', 'The tool profile contract is unreadable.');
      }
      return value;
    },
    async run({ input, sessionId = '', outputSchemaId = '', toolProfileId = '' }) {
      const value = await request(AGENT_RUNTIME_ENDPOINTS.run, {
        method: 'POST',
        bodyJson: createAgentRequest(input, sessionId, { outputSchemaId, toolProfileId })
      });
      return normalizeCompletedResponse(value);
    },
    async createObservableRun({ input, sessionId = '', outputSchemaId = '', toolProfileId = '' }) {
      const value = await request(AGENT_RUNTIME_ENDPOINTS.runs, {
        method: 'POST',
        bodyJson: createAgentRequest(input, sessionId, { outputSchemaId, toolProfileId })
      });
      if (!isPlainObject(value) || !String(value.run_id || '').trim()) {
        throw new AgentRuntimeError('invalid_response', 'The observable run response is missing its run ID.');
      }
      return { run_id: String(value.run_id).trim(), status: String(value.status || 'queued').trim().toLowerCase() };
    },
    async getObservableRun(runId) {
      return normalizeRunSnapshot(await request(AGENT_RUNTIME_ENDPOINTS.observableRun(runId)));
    },
    streamRunEvents,
    async cancelObservableRun(runId) {
      const value = await request(AGENT_RUNTIME_ENDPOINTS.cancelObservableRun(runId), { method: 'POST' });
      if (!isPlainObject(value) || !String(value.run_id || '').trim()) throw new AgentRuntimeError('invalid_response', 'The cancellation response is unreadable.');
      return { run_id: String(value.run_id).trim(), status: String(value.status || '').trim().toLowerCase() };
    }
  });
}
