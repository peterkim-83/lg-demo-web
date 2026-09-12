import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentRuntimeError,
  createAgentRequest,
  createAgentRuntimeClient
} from '../public/agent-playground/runtime-client.mjs';

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; }
  };
}

const completed = Object.freeze({
  status: 'completed',
  runtime: 'codex',
  session_id: 'session_123',
  turn_id: 'turn_456',
  output: 'Completed output',
  duration_ms: 3040
});

test('new and existing session payloads match the backend contract', () => {
  assert.deepEqual(createAgentRequest('  first task  '), { input: 'first task' });
  assert.deepEqual(createAgentRequest('follow up', ' session_123 '), {
    session_id: 'session_123',
    input: 'follow up'
  });
  assert.throws(() => createAgentRequest('   '), AgentRuntimeError);
});

test('runtime request sends Firebase bearer auth without a client-side agent key', async () => {
  const calls = [];
  const client = createAgentRuntimeClient({
    getIdToken: async () => 'firebase-id-token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(completed);
    }
  });

  const result = await client.run({ input: 'Inspect this repository.' });
  assert.equal(result.session_id, 'session_123');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer firebase-id-token');
  assert.equal(Object.hasOwn(calls[0].init.headers, 'X-Agent-Key'), false);
  assert.deepEqual(JSON.parse(calls[0].init.body), { input: 'Inspect this repository.' });
});

test('existing session is continued and a 401 refreshes the Firebase token once', async () => {
  const tokenCalls = [];
  const requests = [];
  const client = createAgentRuntimeClient({
    getIdToken: async (refresh) => {
      tokenCalls.push(refresh);
      return refresh ? 'refreshed-token' : 'cached-token';
    },
    fetchImpl: async (_url, init) => {
      requests.push(init);
      return requests.length === 1 ? response({}, 401) : response(completed);
    }
  });

  await client.run({ input: 'Continue.', sessionId: 'session_123' });
  assert.deepEqual(tokenCalls, [false, true]);
  assert.equal(requests[1].headers.Authorization, 'Bearer refreshed-token');
  assert.deepEqual(JSON.parse(requests[1].body), { session_id: 'session_123', input: 'Continue.' });
});

test('forbidden and runtime failures use stable public error categories', async () => {
  const forbiddenClient = createAgentRuntimeClient({
    getIdToken: async () => 'token',
    fetchImpl: async () => response({ secret: 'do-not-display' }, 403)
  });
  await assert.rejects(
    forbiddenClient.run({ input: 'task' }),
    (error) => error instanceof AgentRuntimeError && error.code === 'forbidden' && !error.message.includes('do-not-display')
  );

  const failedClient = createAgentRuntimeClient({
    getIdToken: async () => 'token',
    fetchImpl: async () => response({ status: 'failed', output: 'private runtime detail' })
  });
  await assert.rejects(
    failedClient.run({ input: 'task' }),
    (error) => error instanceof AgentRuntimeError && error.code === 'runtime_failure' && !error.message.includes('private runtime detail')
  );
});

test('request timeout aborts the fetch and reports a timeout error', async () => {
  const client = createAgentRuntimeClient({
    getIdToken: async () => 'token',
    timeoutMs: 5,
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })
  });

  await assert.rejects(
    client.run({ input: 'long task' }),
    (error) => error instanceof AgentRuntimeError && error.code === 'timeout' && error.status === 408
  );
});
