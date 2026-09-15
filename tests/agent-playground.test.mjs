import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  AGENT_RUNTIME_ENDPOINTS,
  AgentRuntimeError,
  createAgentRequest,
  createAgentRuntimeClient,
  isTerminalRunStatus,
  parseAgentRunEventFrame,
  projectPublicAgentRunEvent,
  resolveModelRegistrySelection
} from '../public/agent-playground/runtime-client.mjs';

const API = 'https://api.example.test';

function response(body, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    body: null,
    async json() { return body; }
  };
}

function sseResponse(chunks) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'text/event-stream; charset=utf-8' : null },
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: encoder.encode(chunks[index++]) };
          }
        };
      }
    }
  };
}

const completedText = Object.freeze({
  status: 'completed', runtime: 'codex', session_id: 'session_123', turn_id: 'turn_456',
  output: 'Completed output', duration_ms: 3040
});

const completedStructured = Object.freeze({
  status: 'completed', runtime: 'codex', session_id: 'session_123', turn_id: 'turn_789',
  output_schema_id: 'schema_discovered_at_runtime', output: { summary: 'Done', score: 0.98 }, duration_ms: 4100
});

test('request payload maps optional session, schema, and tool IDs exactly to the HTTP contract', () => {
  assert.deepEqual(createAgentRequest('  first task  '), { input: 'first task' });
  assert.deepEqual(createAgentRequest('follow up', ' session_123 ', {
    outputSchemaId: ' schema_dynamic ', toolProfileId: ' tools_dynamic '
  }), {
    input: 'follow up', session_id: 'session_123', output_schema_id: 'schema_dynamic', tool_profile_id: 'tools_dynamic'
  });
  assert.throws(() => createAgentRequest('   '), AgentRuntimeError);
});

test('quick run sends Firebase bearer auth, accepts structured output, and never adds an Agent key', async () => {
  const calls = [];
  const client = createAgentRuntimeClient({
    baseUrl: API,
    getIdToken: async () => 'firebase-id-token',
    fetchImpl: async (url, init) => { calls.push({ url, init }); return response(completedStructured); }
  });
  const result = await client.run({ input: 'Analyze this.', outputSchemaId: 'schema_discovered_at_runtime' });
  assert.deepEqual(result.output, { summary: 'Done', score: 0.98 });
  assert.equal(result.output_schema_id, 'schema_discovered_at_runtime');
  assert.equal(calls[0].url, `${API}/v1/agent/run`);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer firebase-id-token');
  assert.equal(Object.hasOwn(calls[0].init.headers, 'X-Agent-Key'), false);
  assert.deepEqual(JSON.parse(calls[0].init.body), { input: 'Analyze this.', output_schema_id: 'schema_discovered_at_runtime' });
});

test('registry discovery and detail inspection use only IDs returned by API callers', async () => {
  const calls = [];
  const client = createAgentRuntimeClient({
    baseUrl: API,
    getIdToken: async () => 'token',
    fetchImpl: async (url) => {
      calls.push(url);
      const path = new URL(url).pathname;
      if (path === AGENT_RUNTIME_ENDPOINTS.capabilities) return response({ runtime: { id: 'codex', api_version: 'v1' }, features: { sse_events: true }, discovery: { output_schemas: '/v1/agent/output-schemas', tool_profiles: '/v1/agent/tool-profiles' } });
      if (path === AGENT_RUNTIME_ENDPOINTS.outputSchemas) return response({ items: [{ id: 'schema_from_registry', version: '1', profile: 'strict', description: 'Registry schema' }] });
      if (path === AGENT_RUNTIME_ENDPOINTS.toolProfiles) return response({ items: [{ id: 'profile_from_registry', version: '1', description: 'Registry tools' }] });
      if (path.endsWith('/output-schemas/schema_from_registry')) return response({ id: 'schema_from_registry', json_schema: { type: 'object' } });
      if (path.endsWith('/tool-profiles/profile_from_registry')) return response({ id: 'profile_from_registry', mcp_servers: [], policy: { read_only: true, approval_mode: 'never' } });
      return response({}, 404);
    }
  });
  const capabilities = await client.getCapabilities();
  const schemas = await client.listOutputSchemas();
  const profiles = await client.listToolProfiles();
  const schema = await client.getOutputSchema(schemas[0].id);
  const profile = await client.getToolProfile(profiles[0].id);
  assert.equal(capabilities.features.sse_events, true);
  assert.equal(schema.id, 'schema_from_registry');
  assert.equal(profile.id, 'profile_from_registry');
  assert.equal(calls.some((url) => url.includes('schema_from_registry')), true);
  assert.equal(calls.some((url) => url.includes('profile_from_registry')), true);
});

test('model discovery preserves the live model-specific contract and uses authenticated no-store requests', async () => {
  const calls = [];
  const catalogResponse = {
    items: [
      {
        id: 'model_alpha',
        display_name: 'Model Alpha',
        description: 'Primary catalog model',
        is_default: true,
        default_reasoning_effort: 'effort_balanced',
        supported_reasoning_efforts: [
          { id: 'effort_fast', description: 'Lower latency' },
          { id: 'effort_balanced', description: 'Balanced execution' }
        ]
      }
    ],
    source: 'runtime_catalog',
    refreshed_at: '2026-09-14T00:00:00Z'
  };
  const client = createAgentRuntimeClient({
    baseUrl: API,
    getIdToken: async () => 'firebase-model-token',
    fetchImpl: async (url, init) => { calls.push({ url, init }); return response(catalogResponse); }
  });

  const catalog = await client.getModelCatalog();
  assert.deepEqual(catalog, catalogResponse);
  assert.equal(new URL(calls[0].url).pathname, AGENT_RUNTIME_ENDPOINTS.models);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer firebase-model-token');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.credentials, 'omit');
});

test('model discovery rejects duplicate IDs, malformed efforts, and unsupported backend defaults', async () => {
  const baseModel = {
    id: 'model_alpha', display_name: 'Model Alpha', description: '', is_default: true,
    default_reasoning_effort: 'effort_balanced',
    supported_reasoning_efforts: [{ id: 'effort_balanced', description: 'Balanced execution' }]
  };
  const invalidCatalogs = [
    { items: [baseModel, { ...baseModel }], source: 'runtime_catalog', refreshed_at: 'now' },
    { items: [{ ...baseModel, supported_reasoning_efforts: [{ id: '', description: '' }] }], source: 'runtime_catalog', refreshed_at: 'now' },
    { items: [{ ...baseModel, default_reasoning_effort: 'effort_missing' }], source: 'runtime_catalog', refreshed_at: 'now' }
  ];

  for (const body of invalidCatalogs) {
    const client = createAgentRuntimeClient({ baseUrl: API, getIdToken: async () => 'token', fetchImpl: async () => response(body) });
    await assert.rejects(client.getModelCatalog(), (error) => error instanceof AgentRuntimeError && error.code === 'invalid_response');
  }
});

test('model selection prefers valid persisted values and otherwise uses backend defaults exactly', () => {
  const catalog = {
    items: [
      {
        id: 'model_alpha', display_name: 'Model Alpha', is_default: true, default_reasoning_effort: 'effort_balanced',
        supported_reasoning_efforts: [{ id: 'effort_fast' }, { id: 'effort_balanced' }]
      },
      {
        id: 'model_beta', display_name: 'Model Beta', is_default: false, default_reasoning_effort: 'effort_deep',
        supported_reasoning_efforts: [{ id: 'effort_balanced' }, { id: 'effort_deep' }]
      }
    ]
  };

  assert.deepEqual(resolveModelRegistrySelection(catalog, 'model_beta', 'effort_balanced'), {
    selectedModelId: 'model_beta', selectedReasoningEffort: 'effort_balanced', modelSource: 'persisted',
    reasoningEffortSource: 'persisted', noticeCodes: [], errorCode: ''
  });
  assert.deepEqual(resolveModelRegistrySelection(catalog), {
    selectedModelId: 'model_alpha', selectedReasoningEffort: 'effort_balanced', modelSource: 'backend_default',
    reasoningEffortSource: 'backend_default', noticeCodes: [], errorCode: ''
  });
});

test('model selection reports removed models and unsupported efforts without heuristic mapping', () => {
  const catalog = {
    items: [{
      id: 'model_alpha', display_name: 'Model Alpha', is_default: true, default_reasoning_effort: 'effort_balanced',
      supported_reasoning_efforts: [{ id: 'effort_fast' }, { id: 'effort_balanced' }]
    }]
  };
  const removedModel = resolveModelRegistrySelection(catalog, 'model_retired', 'effort_fast');
  assert.equal(removedModel.selectedModelId, 'model_alpha');
  assert.equal(removedModel.selectedReasoningEffort, 'effort_fast');
  assert.deepEqual(removedModel.noticeCodes, ['persisted_model_missing']);

  const unsupportedEffort = resolveModelRegistrySelection(catalog, 'model_alpha', 'effort_unknown');
  assert.equal(unsupportedEffort.selectedReasoningEffort, 'effort_balanced');
  assert.equal(unsupportedEffort.reasoningEffortSource, 'backend_default');
  assert.deepEqual(unsupportedEffort.noticeCodes, ['persisted_effort_unsupported']);
});

test('model selection fails visibly when a backend default cannot be chosen', () => {
  const model = {
    id: 'model_alpha', display_name: 'Model Alpha', is_default: false, default_reasoning_effort: 'effort_balanced',
    supported_reasoning_efforts: [{ id: 'effort_balanced' }]
  };
  assert.equal(resolveModelRegistrySelection({ items: [] }).errorCode, 'empty_catalog');
  assert.equal(resolveModelRegistrySelection({ items: [model] }).errorCode, 'default_model_missing');
  assert.equal(resolveModelRegistrySelection({ items: [model, { ...model, id: 'model_beta', is_default: true }, { ...model, id: 'model_gamma', is_default: true }] }).errorCode, 'default_model_ambiguous');
  assert.equal(resolveModelRegistrySelection({ items: [model] }, 'model_alpha').selectedModelId, 'model_alpha');
});

test('observable run create, snapshot, and cancellation routes remain exact', async () => {
  const calls = [];
  const client = createAgentRuntimeClient({
    baseUrl: API,
    getIdToken: async () => 'token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const path = new URL(url).pathname;
      if (path === '/v1/agent/runs') return response({ run_id: 'run_123', status: 'queued' }, 202);
      if (path === '/v1/agent/runs/run_123/cancel') return response({ run_id: 'run_123', status: 'cancelled' });
      return response({ run_id: 'run_123', status: 'completed', runtime: 'codex', session_id: 'session_123', turn_id: 'turn_456', output_schema_id: 'schema_live', tool_profile_id: 'profile_live', output: { ok: true }, duration_ms: 900, error: null, created_at: '2026-09-13T00:00:00Z', started_at: '2026-09-13T00:00:01Z', completed_at: '2026-09-13T00:00:02Z' });
    }
  });
  const created = await client.createObservableRun({ input: 'Mission', sessionId: 'session_123', outputSchemaId: 'schema_live', toolProfileId: 'profile_live' });
  const snapshot = await client.getObservableRun(created.run_id);
  const cancelled = await client.cancelObservableRun(created.run_id);
  assert.deepEqual(created, { run_id: 'run_123', status: 'queued' });
  assert.equal(snapshot.output.ok, true);
  assert.deepEqual(cancelled, { run_id: 'run_123', status: 'cancelled' });
  assert.deepEqual(JSON.parse(calls[0].init.body), { input: 'Mission', session_id: 'session_123', output_schema_id: 'schema_live', tool_profile_id: 'profile_live' });
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), ['/v1/agent/runs', '/v1/agent/runs/run_123', '/v1/agent/runs/run_123/cancel']);
  assert.equal(calls[2].init.body, undefined);
});

test('a 401 refreshes the Firebase token once for registry and execution requests', async () => {
  const tokenCalls = [];
  let callCount = 0;
  const client = createAgentRuntimeClient({
    baseUrl: API,
    getIdToken: async (refresh) => { tokenCalls.push(refresh); return refresh ? 'fresh' : 'cached'; },
    fetchImpl: async () => ++callCount === 1 ? response({}, 401) : response(completedText)
  });
  await client.run({ input: 'Continue.', sessionId: 'session_123' });
  assert.deepEqual(tokenCalls, [false, true]);

  const modelTokenCalls = [];
  let modelCallCount = 0;
  const modelClient = createAgentRuntimeClient({
    baseUrl: API,
    getIdToken: async (refresh) => { modelTokenCalls.push(refresh); return refresh ? 'fresh-model-token' : 'cached-model-token'; },
    fetchImpl: async () => {
      if (++modelCallCount === 1) return response({}, 401);
      return response({
        items: [{
          id: 'model_alpha', display_name: 'Model Alpha', description: '', is_default: true,
          default_reasoning_effort: 'effort_balanced',
          supported_reasoning_efforts: [{ id: 'effort_balanced', description: '' }]
        }],
        source: 'runtime_catalog', refreshed_at: 'now'
      });
    }
  });
  await modelClient.getModelCatalog();
  assert.deepEqual(modelTokenCalls, [false, true]);
});

test('SSE frame parsing allowlists lifecycle types and projects only public tool metadata', () => {
  const frame = [
    'id: event_004',
    'event: tool.started',
    'data: {"type":"tool.started","timestamp":"2026-09-13T00:00:02Z","payload":{"tool_server":"research","tool_name":"search","argument_keys":["query","limit"],"argument_count":2,"private_reasoning":"never expose","raw_result":{"secret":true}}}'
  ].join('\n');
  const event = parseAgentRunEventFrame(frame);
  assert.deepEqual(event.argumentKeys, ['query', 'limit']);
  assert.equal(event.toolServer, 'research');
  assert.equal(event.toolName, 'search');
  assert.equal(Object.hasOwn(event, 'private_reasoning'), false);
  assert.equal(JSON.stringify(event).includes('never expose'), false);
  assert.equal(parseAgentRunEventFrame('event: internal.reasoning\ndata: {"type":"internal.reasoning","payload":{"text":"secret"}}'), null);
});

test('public event projection supports documented success, duration, validation, and terminal semantics', () => {
  const completed = projectPublicAgentRunEvent({ event: 'tool.completed', data: { payload: { server: 'files', name: 'read', success: true, duration_ms: 125 } } });
  const validated = projectPublicAgentRunEvent({ event: 'output.validated', data: { payload: { valid: true, output_schema_id: 'schema_runtime' } } });
  const started = projectPublicAgentRunEvent({ event: 'run.started', data: { type: 'run.started', payload: {} } });
  assert.equal(completed.success, true);
  assert.equal(completed.durationMs, 125);
  assert.equal(validated.schemaId, 'schema_runtime');
  assert.equal(started.argumentCount, null);
  assert.equal(started.durationMs, null);
  assert.equal(started.sequence, null);
  assert.equal(isTerminalRunStatus('completed'), true);
  assert.equal(isTerminalRunStatus('running'), false);
});

test('authenticated SSE handles chunk boundaries and sends Last-Event-ID without EventSource', async () => {
  const calls = [];
  const events = [];
  const client = createAgentRuntimeClient({
    baseUrl: API,
    getIdToken: async () => 'firebase-token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return sseResponse([
        'id: 1\nevent: run.started\ndata: {"type":"run.started"}\n\nid: 2\nevent: tool.comp',
        'leted\ndata: {"type":"tool.completed","payload":{"tool_server":"search","tool_name":"lookup","success":true,"duration_ms":88}}\n\n',
        'id: 3\nevent: run.completed\ndata: {"type":"run.completed"}\n\n'
      ]);
    }
  });
  await client.streamRunEvents('run_123', { lastEventId: '0', onEvent: (event) => events.push(event) });
  assert.deepEqual(events.map((event) => event.type), ['run.started', 'tool.completed', 'run.completed']);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer firebase-token');
  assert.equal(calls[0].init.headers['Last-Event-ID'], '0');
  assert.equal(calls[0].init.headers.Accept, 'text/event-stream');
});

test('forbidden, malformed output, and timeout failures use stable public errors', async () => {
  const forbidden = createAgentRuntimeClient({ baseUrl: API, getIdToken: async () => 'token', fetchImpl: async () => response({ private: 'hidden' }, 403) });
  await assert.rejects(forbidden.getCapabilities(), (error) => error.code === 'forbidden' && !error.message.includes('hidden'));

  const malformed = createAgentRuntimeClient({ baseUrl: API, getIdToken: async () => 'token', fetchImpl: async () => response({ status: 'completed', session_id: 's', output: null }) });
  await assert.rejects(malformed.run({ input: 'task' }), (error) => error.code === 'invalid_response');

  const timeout = createAgentRuntimeClient({
    baseUrl: API, getIdToken: async () => 'token', timeoutMs: 5,
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
  });
  await assert.rejects(timeout.run({ input: 'long task' }), (error) => error.code === 'timeout' && error.status === 408);
});

test('production Workbench source has no fixed registry IDs, EventSource, or browser Agent key', async () => {
  const sources = await Promise.all([
    readFile(new URL('../public/agent-playground/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/agent-playground/runtime-client.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../public/agent-playground/index.html', import.meta.url), 'utf8')
  ]);
  const source = sources.join('\n').toLowerCase();
  assert.equal(source.includes('generic_analysis_v1'), false);
  assert.equal(source.includes('research_mcp_readonly_v1'), false);
  assert.equal(source.includes('x-agent-key'), false);
  assert.equal(source.includes('new eventsource'), false);
  assert.equal(source.includes('gpt-5'), false);
  assert.doesNotMatch(source, /\[(?:\s*['"](?:none|minimal|low|medium|high|xhigh|max)['"]\s*,?){2,}\s*\]/);
  assert.match(source, /\/v1\/agent\/models/);
  assert.match(source, /id="modelselect"/);
  assert.match(source, /id="reasoningeffortselect"/);
  assert.match(source, /authorization: `bearer \$\{token\}`/);
});
