export const AGENT_RUNTIME_ENDPOINT = 'https://api.peter-n8n.duckdns.org/v1/agent/run';
export const AGENT_RUNTIME_TIMEOUT_MS = 90_000;

const PUBLIC_ERROR_MESSAGES = Object.freeze({
  400: 'The runtime rejected this request. Review the prompt and try again.',
  401: 'Your Firebase session is no longer authorized. Sign in again and retry.',
  403: 'This account does not have permission to use the agent runtime.',
  408: 'The agent runtime timed out before completing this turn.',
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

export function createAgentRequest(input, sessionId = '') {
  const normalizedInput = String(input || '').trim();
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedInput) throw new AgentRuntimeError('input_required', 'Enter an instruction before running the agent.');
  return normalizedSessionId ? { session_id: normalizedSessionId, input: normalizedInput } : { input: normalizedInput };
}

function messageForStatus(status) {
  if (PUBLIC_ERROR_MESSAGES[status]) return PUBLIC_ERROR_MESSAGES[status];
  if (status >= 500) return 'The agent runtime reported a failure. Try this turn again in a moment.';
  return 'The agent runtime could not complete this request.';
}

function normalizeCompletedResponse(value) {
  if (!value || typeof value !== 'object') {
    throw new AgentRuntimeError('invalid_response', 'The runtime returned an unreadable response.');
  }
  if (String(value.status || '').toLowerCase() !== 'completed') {
    throw new AgentRuntimeError('runtime_failure', 'The agent runtime did not complete this turn.');
  }

  const sessionId = String(value.session_id || '').trim();
  const output = typeof value.output === 'string' ? value.output : '';
  if (!sessionId || !output) {
    throw new AgentRuntimeError('invalid_response', 'The runtime response is missing required session or output data.');
  }

  return {
    status: 'completed',
    runtime: String(value.runtime || 'codex').trim().toLowerCase() || 'codex',
    session_id: sessionId,
    turn_id: String(value.turn_id || '').trim(),
    output,
    duration_ms: Number.isFinite(Number(value.duration_ms)) ? Math.max(0, Number(value.duration_ms)) : null
  };
}

export function createAgentRuntimeClient({
  endpoint = AGENT_RUNTIME_ENDPOINT,
  fetchImpl = globalThis.fetch,
  getIdToken,
  timeoutMs = AGENT_RUNTIME_TIMEOUT_MS
} = {}) {
  if (typeof fetchImpl !== 'function' || typeof getIdToken !== 'function') {
    throw new TypeError('agent_runtime_dependencies_required');
  }

  async function execute(payload, forceRefresh = false) {
    const token = await getIdToken(forceRefresh);
    if (!String(token || '').trim()) {
      throw new AgentRuntimeError('auth_missing', 'Sign in with Firebase before running the agent.', 401);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify(payload)
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new AgentRuntimeError('timeout', `The runtime did not respond within ${Math.round(timeoutMs / 1000)} seconds.`, 408);
      }
      throw new AgentRuntimeError('unreachable', 'The agent runtime is unreachable. Check the connection and try again.');
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    async run({ input, sessionId = '' }) {
      const payload = createAgentRequest(input, sessionId);
      let response = await execute(payload, false);
      if (response.status === 401) response = await execute(payload, true);
      if (!response.ok) {
        const code = response.status === 401 ? 'unauthorized' : response.status === 403 ? 'forbidden' : response.status === 408 ? 'timeout' : 'runtime_failure';
        throw new AgentRuntimeError(code, messageForStatus(response.status), response.status);
      }

      let data;
      try {
        data = await response.json();
      } catch (_) {
        throw new AgentRuntimeError('invalid_response', 'The runtime returned an unreadable response.', response.status);
      }
      return normalizeCompletedResponse(data);
    }
  });
}
