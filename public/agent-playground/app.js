import { getFirebaseBrowserAuthClient, getFirebaseAuthErrorCode, signInWithGoogle } from '../firebase-auth-client.mjs';
import {
  AgentRuntimeError,
  PUBLIC_AGENT_EVENT_TYPES,
  createAgentRuntimeClient,
  isTerminalRunStatus
} from './runtime-client.mjs';

const STORAGE_KEYS = Object.freeze({
  sessionId: 'lge.agentPlayground.sessionId.v1',
  conversation: 'lge.agentPlayground.conversation.v1',
  workbench: 'lge.agentPlayground.workbench.v1'
});
const MAX_HISTORY_MESSAGES = 80;
const MAX_STORED_CONTENT_LENGTH = 50_000;
const MAX_EVENTS = 200;
const PUBLIC_EVENT_TYPE_SET = new Set(PUBLIC_AGENT_EVENT_TYPES);

const elements = {
  headerStatusDot: document.getElementById('headerStatusDot'),
  headerStatusText: document.getElementById('headerStatusText'),
  statusAlert: document.getElementById('statusAlert'),
  statusAlertTitle: document.getElementById('statusAlertTitle'),
  statusAlertMessage: document.getElementById('statusAlertMessage'),
  authAvatar: document.getElementById('authAvatar'),
  authIdentity: document.getElementById('authIdentity'),
  authButton: document.getElementById('authButton'),
  sessionId: document.getElementById('sessionId'),
  runId: document.getElementById('runId'),
  turnCount: document.getElementById('turnCount'),
  lastLatency: document.getElementById('lastLatency'),
  newSessionButton: document.getElementById('newSessionButton'),
  conversation: document.getElementById('conversation'),
  emptyState: document.getElementById('emptyState'),
  conversationTurnCount: document.getElementById('conversationTurnCount'),
  conversationTurnLabel: document.getElementById('conversationTurnLabel'),
  promptForm: document.getElementById('promptForm'),
  promptInput: document.getElementById('promptInput'),
  runButton: document.getElementById('runButton'),
  runButtonLabel: document.getElementById('runButtonLabel'),
  executionModes: [...document.querySelectorAll('input[name="executionMode"]')],
  registryStatus: document.getElementById('registryStatus'),
  refreshRegistryButton: document.getElementById('refreshRegistryButton'),
  toolProfileSelect: document.getElementById('toolProfileSelect'),
  outputSchemaSelect: document.getElementById('outputSchemaSelect'),
  toolProfileDescription: document.getElementById('toolProfileDescription'),
  outputSchemaDescription: document.getElementById('outputSchemaDescription'),
  capabilitySummary: document.getElementById('capabilitySummary'),
  contractTabs: [...document.querySelectorAll('[data-contract-tab]')],
  contractDetail: document.getElementById('contractDetail'),
  streamStatus: document.getElementById('streamStatus'),
  cancelRunButton: document.getElementById('cancelRunButton'),
  reconnectButton: document.getElementById('reconnectButton'),
  activityTimeline: document.getElementById('activityTimeline'),
  activityEmpty: document.getElementById('activityEmpty'),
  resultStatus: document.getElementById('resultStatus'),
  resultSchemaId: document.getElementById('resultSchemaId'),
  resultValidation: document.getElementById('resultValidation'),
  resultRunStatus: document.getElementById('resultRunStatus'),
  resultDuration: document.getElementById('resultDuration'),
  resultTabs: [...document.querySelectorAll('[data-result-tab]')],
  resultTree: document.getElementById('resultTree'),
  resultJson: document.getElementById('resultJson'),
  copyResultButton: document.getElementById('copyResultButton'),
  toggleDraftButton: document.getElementById('toggleDraftButton'),
  draftEditorRegion: document.getElementById('draftEditorRegion'),
  draftSchemaInput: document.getElementById('draftSchemaInput'),
  draftValidationStatus: document.getElementById('draftValidationStatus'),
  validateDraftButton: document.getElementById('validateDraftButton'),
  clearDraftButton: document.getElementById('clearDraftButton')
};

const restoredWorkbench = loadWorkbenchState();
const state = {
  sessionId: loadSessionId(),
  history: loadHistory(),
  firebaseClient: null,
  currentUser: null,
  runtimeClient: null,
  authState: 'initializing',
  runtimeState: 'initializing',
  isRunning: false,
  isFinalizing: false,
  registryState: 'idle',
  capabilities: null,
  outputSchemas: [],
  toolProfiles: [],
  outputSchemaDetail: null,
  toolProfileDetail: null,
  selectedOutputSchemaId: restoredWorkbench.selectedOutputSchemaId,
  selectedToolProfileId: restoredWorkbench.selectedToolProfileId,
  executionMode: restoredWorkbench.executionMode,
  contractTab: restoredWorkbench.contractTab,
  resultTab: restoredWorkbench.resultTab,
  activeRunId: restoredWorkbench.activeRunId,
  runStatus: restoredWorkbench.runStatus,
  streamStatus: 'idle',
  streamController: null,
  streamEpoch: 0,
  reconnectAttempt: 0,
  lastEventId: restoredWorkbench.lastEventId,
  events: restoredWorkbench.events,
  result: restoredWorkbench.result,
  validationStatus: restoredWorkbench.validationStatus,
  draftText: restoredWorkbench.draftText
};

function loadSessionId() {
  try { return String(localStorage.getItem(STORAGE_KEYS.sessionId) || '').trim(); } catch (_) { return ''; }
}

function finiteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStoredMessage(value) {
  if (!value || typeof value !== 'object') return null;
  const role = ['user', 'agent', 'notice'].includes(value.role) ? value.role : '';
  const content = typeof value.content === 'string' ? value.content.slice(0, MAX_STORED_CONTENT_LENGTH) : '';
  if (!role || !content) return null;
  return {
    role,
    content,
    timestamp: finiteNumberOrNull(value.timestamp) ?? Date.now(),
    turnId: typeof value.turnId === 'string' ? value.turnId.slice(0, 500) : '',
    runId: typeof value.runId === 'string' ? value.runId.slice(0, 500) : '',
    schemaId: typeof value.schemaId === 'string' ? value.schemaId.slice(0, 256) : '',
    durationMs: finiteNumberOrNull(value.durationMs) === null ? null : Math.max(0, finiteNumberOrNull(value.durationMs))
  };
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.conversation) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredMessage).filter(Boolean).slice(-MAX_HISTORY_MESSAGES);
  } catch (_) { return []; }
}

function normalizeStoredEvent(value) {
  if (!value || typeof value !== 'object' || !PUBLIC_EVENT_TYPE_SET.has(value.type)) return null;
  return {
    id: String(value.id || '').slice(0, 500),
    type: value.type,
    timestamp: String(value.timestamp || '').slice(0, 100),
    receivedAt: finiteNumberOrNull(value.receivedAt) ?? Date.now(),
    sequence: finiteNumberOrNull(value.sequence),
    runId: String(value.runId || '').slice(0, 500),
    toolServer: String(value.toolServer || '').slice(0, 500),
    toolName: String(value.toolName || '').slice(0, 500),
    argumentKeys: Array.isArray(value.argumentKeys) ? value.argumentKeys.filter((item) => typeof item === 'string').slice(0, 50) : [],
    argumentCount: finiteNumberOrNull(value.argumentCount),
    success: typeof value.success === 'boolean' ? value.success : null,
    durationMs: finiteNumberOrNull(value.durationMs),
    status: String(value.status || '').slice(0, 120),
    schemaId: String(value.schemaId || '').slice(0, 256)
  };
}

function loadWorkbenchState() {
  const fallback = {
    selectedOutputSchemaId: '', selectedToolProfileId: '', executionMode: 'observable',
    contractTab: 'capabilities', resultTab: 'tree', activeRunId: '', runStatus: 'idle',
    lastEventId: '', events: [], result: null, validationStatus: 'not_requested', draftText: ''
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.workbench) || '{}');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      selectedOutputSchemaId: String(parsed.selectedOutputSchemaId || '').slice(0, 256),
      selectedToolProfileId: String(parsed.selectedToolProfileId || '').slice(0, 256),
      executionMode: parsed.executionMode === 'quick' ? 'quick' : 'observable',
      contractTab: ['capabilities', 'tool', 'schema'].includes(parsed.contractTab) ? parsed.contractTab : 'capabilities',
      resultTab: parsed.resultTab === 'json' ? 'json' : 'tree',
      activeRunId: String(parsed.activeRunId || '').slice(0, 500),
      runStatus: String(parsed.runStatus || 'idle').slice(0, 120),
      lastEventId: String(parsed.lastEventId || '').slice(0, 500),
      events: Array.isArray(parsed.events) ? parsed.events.map(normalizeStoredEvent).filter(Boolean).slice(-MAX_EVENTS) : [],
      result: parsed.result && typeof parsed.result === 'object' ? parsed.result : null,
      validationStatus: String(parsed.validationStatus || 'not_requested').slice(0, 120),
      draftText: typeof parsed.draftText === 'string' ? parsed.draftText.slice(0, 250_000) : ''
    };
  } catch (_) { return fallback; }
}

function saveConversationState() {
  try {
    if (state.sessionId) localStorage.setItem(STORAGE_KEYS.sessionId, state.sessionId);
    else localStorage.removeItem(STORAGE_KEYS.sessionId);
    localStorage.setItem(STORAGE_KEYS.conversation, JSON.stringify(state.history.slice(-MAX_HISTORY_MESSAGES)));
  } catch (_) {
    showAlert('Storage unavailable', 'This browser could not persist the current runtime session.', 'error');
  }
}

function saveWorkbenchState() {
  const projected = {
    selectedOutputSchemaId: state.selectedOutputSchemaId,
    selectedToolProfileId: state.selectedToolProfileId,
    executionMode: state.executionMode,
    contractTab: state.contractTab,
    resultTab: state.resultTab,
    activeRunId: state.activeRunId,
    runStatus: state.runStatus,
    lastEventId: state.lastEventId,
    events: state.events.slice(-MAX_EVENTS),
    result: state.result,
    validationStatus: state.validationStatus,
    draftText: state.draftText
  };
  try { localStorage.setItem(STORAGE_KEYS.workbench, JSON.stringify(projected)); } catch (_) {}
}

function completedTurnCount() {
  return state.history.filter((message) => message.role === 'agent').length;
}

function latestLatency() {
  return [...state.history].reverse().find((message) => message.role === 'agent' && Number.isFinite(message.durationMs))?.durationMs ?? null;
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function formatLatency(durationMs) {
  if (!Number.isFinite(durationMs)) return '—';
  return durationMs >= 1000 ? `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 1 : 2)} s` : `${Math.round(durationMs)} ms`;
}

function formatOutput(output) {
  return typeof output === 'string' ? output : JSON.stringify(output, null, 2);
}

function setRuntimeStatus(kind, label) {
  state.runtimeState = kind;
  elements.headerStatusDot.className = 'apg-status-dot';
  if (kind === 'ready' || kind === 'completed') elements.headerStatusDot.classList.add('is-ready');
  else if (kind === 'running') elements.headerStatusDot.classList.add('is-running');
  else if (kind === 'error') elements.headerStatusDot.classList.add('is-error');
  else if (kind === 'auth-required') elements.headerStatusDot.classList.add('is-warning');
  elements.headerStatusText.textContent = label;
}

function showAlert(title, message, tone = 'warning') {
  elements.statusAlert.hidden = false;
  elements.statusAlert.classList.toggle('is-error', tone === 'error');
  elements.statusAlertTitle.textContent = title;
  elements.statusAlertMessage.textContent = message;
}

function hideAlert() {
  elements.statusAlert.hidden = true;
  elements.statusAlert.classList.remove('is-error');
  elements.statusAlertTitle.textContent = '';
  elements.statusAlertMessage.textContent = '';
}

function messageElement(message) {
  const article = document.createElement('article');
  article.className = `apg-message apg-message--${message.role}`;
  const role = document.createElement('div');
  role.className = 'apg-message__role';
  const label = document.createElement('strong');
  label.textContent = message.role === 'agent' ? 'Codex agent' : message.role === 'notice' ? 'Runtime notice' : 'You';
  const time = document.createElement('time');
  time.dateTime = new Date(message.timestamp).toISOString();
  time.textContent = formatTime(message.timestamp);
  role.append(label, time);

  const body = document.createElement('div');
  body.className = 'apg-message__body';
  const content = document.createElement('p');
  content.className = 'apg-message__content';
  content.textContent = message.content;
  body.append(content);
  if (message.role === 'agent' && (message.turnId || message.runId || message.schemaId || Number.isFinite(message.durationMs))) {
    const meta = document.createElement('div');
    meta.className = 'apg-message__meta';
    const values = [
      message.runId ? `run ${message.runId}` : '',
      message.turnId ? `turn ${message.turnId}` : '',
      message.schemaId ? `schema ${message.schemaId}` : '',
      Number.isFinite(message.durationMs) ? `latency ${formatLatency(message.durationMs)}` : ''
    ].filter(Boolean);
    values.forEach((value) => { const span = document.createElement('span'); span.textContent = value; meta.append(span); });
    body.append(meta);
  }
  article.append(role, body);
  return article;
}

function renderConversation({ scroll = false } = {}) {
  elements.emptyState.hidden = state.history.length > 0;
  elements.conversation.querySelectorAll('.apg-message').forEach((node) => node.remove());
  const fragment = document.createDocumentFragment();
  state.history.forEach((message) => fragment.append(messageElement(message)));
  elements.conversation.append(fragment);
  if (scroll) elements.conversation.scrollTop = elements.conversation.scrollHeight;
}

function addMessage(message) {
  const normalized = normalizeStoredMessage({ ...message, timestamp: message.timestamp || Date.now() });
  if (!normalized) return;
  state.history.push(normalized);
  state.history = state.history.slice(-MAX_HISTORY_MESSAGES);
  saveConversationState();
  renderConversation({ scroll: true });
  renderMetadata();
}

function renderMetadata() {
  const turns = completedTurnCount();
  elements.sessionId.textContent = state.sessionId || 'Not established';
  elements.sessionId.title = state.sessionId || 'No active session';
  elements.runId.textContent = state.activeRunId || '—';
  elements.runId.title = state.activeRunId || 'No observable run';
  elements.turnCount.textContent = String(turns);
  elements.conversationTurnCount.textContent = String(turns);
  elements.conversationTurnLabel.textContent = turns === 1 ? 'turn' : 'turns';
  elements.lastLatency.textContent = formatLatency(latestLatency());
}

function currentExecutionMode() {
  return elements.executionModes.find((input) => input.checked)?.value === 'quick' ? 'quick' : 'observable';
}

function enforceExecutionMode() {
  const quick = elements.executionModes.find((input) => input.value === 'quick');
  const observable = elements.executionModes.find((input) => input.value === 'observable');
  quick.disabled = Boolean(state.selectedToolProfileId) || state.isRunning;
  if (state.selectedToolProfileId && quick.checked) observable.checked = true;
  state.executionMode = currentExecutionMode();
  elements.runButtonLabel.textContent = state.executionMode === 'observable' ? 'Start Observable Run' : 'Run Quick Turn';
}

function renderControls() {
  enforceExecutionMode();
  const authenticated = state.authState === 'authenticated';
  const hasPrompt = Boolean(elements.promptInput.value.trim());
  elements.runButton.disabled = !authenticated || !hasPrompt || state.isRunning;
  elements.runButton.classList.toggle('is-busy', state.isRunning);
  elements.promptInput.disabled = state.isRunning;
  elements.executionModes.forEach((input) => { if (input.value !== 'quick' || !state.selectedToolProfileId) input.disabled = state.isRunning; });
  elements.newSessionButton.disabled = state.isRunning || (!state.sessionId && !state.activeRunId && state.history.length === 0);
  elements.authButton.disabled = ['initializing', 'authenticating', 'unavailable'].includes(state.authState) || state.isRunning;
  const registryReady = state.registryState === 'ready' || state.registryState === 'partial';
  elements.toolProfileSelect.disabled = !authenticated || !registryReady || state.isRunning;
  elements.outputSchemaSelect.disabled = !authenticated || !registryReady || state.isRunning;
  elements.refreshRegistryButton.disabled = !authenticated || state.registryState === 'loading' || state.isRunning;
  elements.cancelRunButton.hidden = !state.isRunning || state.executionMode !== 'observable' || !state.activeRunId;
  elements.cancelRunButton.disabled = state.runStatus === 'cancelling';
}

function renderAuth() {
  if (state.authState === 'authenticated' && state.currentUser) {
    const identity = state.currentUser.email || state.currentUser.displayName || state.currentUser.uid || 'Authenticated user';
    elements.authIdentity.textContent = identity;
    elements.authIdentity.title = identity;
    elements.authAvatar.textContent = (state.currentUser.displayName || state.currentUser.email || 'U').trim().charAt(0).toUpperCase();
    elements.authButton.textContent = 'Sign out';
  } else if (state.authState === 'authenticating') {
    elements.authIdentity.textContent = 'Opening Google sign-in…';
    elements.authAvatar.textContent = '…';
    elements.authButton.textContent = 'Sign in';
  } else if (state.authState === 'unavailable') {
    elements.authIdentity.textContent = 'Firebase unavailable';
    elements.authAvatar.textContent = '!';
    elements.authButton.textContent = 'Sign in';
  } else if (state.authState === 'signed-out') {
    elements.authIdentity.textContent = 'Authentication required';
    elements.authAvatar.textContent = '?';
    elements.authButton.textContent = 'Sign in';
  } else {
    elements.authIdentity.textContent = 'Checking session…';
    elements.authAvatar.textContent = '…';
    elements.authButton.textContent = 'Sign in';
  }
  renderControls();
}

function selectedSummary(items, id) {
  return items.find((item) => item.id === id) || null;
}

function replaceOptions(select, leadingLabel, items, selectedId) {
  select.replaceChildren();
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = leadingLabel;
  select.append(empty);
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.version ? `${item.id} · ${item.version}` : item.id;
    select.append(option);
  });
  select.value = items.some((item) => item.id === selectedId) ? selectedId : '';
}

function renderRegistry() {
  const statusCopy = { idle: 'Waiting for auth', loading: 'Discovering…', ready: 'Registry ready', partial: 'Partial registry', error: 'Discovery failed' };
  elements.registryStatus.textContent = statusCopy[state.registryState] || state.registryState;
  replaceOptions(elements.toolProfileSelect, 'No tools', state.toolProfiles, state.selectedToolProfileId);
  replaceOptions(elements.outputSchemaSelect, 'Free text', state.outputSchemas, state.selectedOutputSchemaId);
  if (['ready', 'partial', 'error'].includes(state.registryState)) {
    state.selectedToolProfileId = elements.toolProfileSelect.value;
    state.selectedOutputSchemaId = elements.outputSchemaSelect.value;
  }
  const tool = selectedSummary(state.toolProfiles, state.selectedToolProfileId);
  const schema = selectedSummary(state.outputSchemas, state.selectedOutputSchemaId);
  elements.toolProfileDescription.textContent = tool?.description || (state.toolProfiles.length ? 'No controlled tool profile will be attached.' : state.registryState === 'loading' ? 'Loading approved tool profiles…' : 'No approved tool profiles are available.');
  elements.outputSchemaDescription.textContent = schema?.description || (state.outputSchemas.length ? 'The runtime will return its standard text response.' : state.registryState === 'loading' ? 'Loading registered output schemas…' : 'No registered output schemas are available.');
  renderCapabilities();
  renderContractDetail();
  renderControls();
  saveWorkbenchState();
}

function humanizeFeature(value) {
  return String(value || '').replaceAll('_', ' ');
}

function renderCapabilities() {
  elements.capabilitySummary.replaceChildren();
  const features = state.capabilities?.features;
  if (!features || typeof features !== 'object') {
    const empty = document.createElement('div');
    empty.className = 'apg-contract-empty';
    empty.textContent = state.registryState === 'error' ? 'Capability discovery failed.' : 'Capabilities load after Firebase authentication.';
    elements.capabilitySummary.append(empty);
    return;
  }
  Object.entries(features).forEach(([key, available]) => {
    const item = document.createElement('div');
    item.className = `apg-capability-item${available ? '' : ' is-disabled'}`;
    const label = document.createElement('strong');
    label.textContent = humanizeFeature(key);
    const status = document.createElement('span');
    status.textContent = available ? 'Available' : 'Unavailable';
    item.append(label, status);
    elements.capabilitySummary.append(item);
  });
}

function renderContractTabs() {
  elements.contractTabs.forEach((button) => {
    const active = button.dataset.contractTab === state.contractTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function renderContractDetail() {
  renderContractTabs();
  let value = null;
  let emptyCopy = '';
  if (state.contractTab === 'capabilities') {
    value = state.capabilities;
    emptyCopy = 'Authenticate to discover the public runtime capability contract.';
  } else if (state.contractTab === 'tool') {
    value = state.toolProfileDetail;
    emptyCopy = state.selectedToolProfileId ? 'Loading selected tool profile…' : 'Select an approved tool profile to inspect its public tools and policy.';
  } else {
    value = state.outputSchemaDetail;
    emptyCopy = state.selectedOutputSchemaId ? 'Loading selected output schema…' : 'Select a registered output schema to inspect its public JSON Schema.';
  }
  elements.contractDetail.textContent = value ? JSON.stringify(value, null, 2) : emptyCopy;
}

async function loadSelectedToolProfile() {
  const id = state.selectedToolProfileId;
  state.toolProfileDetail = null;
  renderContractDetail();
  if (!id || !state.runtimeClient) return;
  try {
    const detail = await state.runtimeClient.getToolProfile(id);
    if (state.selectedToolProfileId === id) state.toolProfileDetail = detail;
  } catch (error) {
    if (state.selectedToolProfileId === id) showAlert('Tool profile unavailable', describeRuntimeError(error), 'error');
  }
  renderContractDetail();
}

async function loadSelectedOutputSchema() {
  const id = state.selectedOutputSchemaId;
  state.outputSchemaDetail = null;
  renderContractDetail();
  if (!id || !state.runtimeClient) return;
  try {
    const detail = await state.runtimeClient.getOutputSchema(id);
    if (state.selectedOutputSchemaId === id) state.outputSchemaDetail = detail;
  } catch (error) {
    if (state.selectedOutputSchemaId === id) showAlert('Output schema unavailable', describeRuntimeError(error), 'error');
  }
  renderContractDetail();
}

async function loadRegistry() {
  if (!state.runtimeClient || !state.currentUser || state.registryState === 'loading') return;
  state.registryState = 'loading';
  renderRegistry();
  hideAlert();
  const [capabilities, outputSchemas, toolProfiles] = await Promise.allSettled([
    state.runtimeClient.getCapabilities(),
    state.runtimeClient.listOutputSchemas(),
    state.runtimeClient.listToolProfiles()
  ]);
  if (capabilities.status === 'fulfilled') state.capabilities = capabilities.value;
  if (outputSchemas.status === 'fulfilled') state.outputSchemas = outputSchemas.value;
  if (toolProfiles.status === 'fulfilled') state.toolProfiles = toolProfiles.value;
  const failures = [capabilities, outputSchemas, toolProfiles].filter((result) => result.status === 'rejected');
  state.registryState = failures.length === 0 ? 'ready' : failures.length === 3 ? 'error' : 'partial';
  if (state.registryState !== 'ready') {
    const authFailure = failures.find((result) => ['unauthorized', 'forbidden'].includes(result.reason?.code));
    showAlert(authFailure ? 'Runtime authorization failed' : 'Registry discovery incomplete', authFailure ? describeRuntimeError(authFailure.reason) : 'One or more runtime registries could not be loaded. Refresh discovery to retry.', 'error');
  }
  renderRegistry();
  await Promise.all([loadSelectedToolProfile(), loadSelectedOutputSchema()]);
}

function eventTone(type, success) {
  if (type.endsWith('.failed') || type === 'run.cancelled' || success === false) return 'is-failure';
  if (type.endsWith('.completed') || type === 'output.validated' || success === true) return 'is-success';
  if (type.endsWith('.started') || type === 'tool.progress' || type === 'output.validating') return 'is-active';
  return '';
}

function eventMarker(type) {
  if (type.endsWith('.failed')) return '!';
  if (type.endsWith('.completed') || type === 'output.validated') return '✓';
  if (type === 'run.cancelled') return '×';
  return '•';
}

function renderActivity() {
  elements.activityTimeline.querySelectorAll('.apg-activity-event').forEach((node) => node.remove());
  elements.activityEmpty.hidden = state.events.length > 0;
  const fragment = document.createDocumentFragment();
  state.events.forEach((event) => {
    const article = document.createElement('article');
    article.className = `apg-activity-event ${eventTone(event.type, event.success)}`.trim();
    const marker = document.createElement('span');
    marker.className = 'apg-activity-event__marker';
    marker.textContent = eventMarker(event.type);
    const body = document.createElement('div');
    body.className = 'apg-activity-event__body';
    const head = document.createElement('div');
    head.className = 'apg-activity-event__head';
    const title = document.createElement('strong');
    title.textContent = event.type;
    const time = document.createElement('time');
    time.textContent = formatTime(event.timestamp || event.receivedAt);
    head.append(title, time);
    body.append(head);
    const metadataValues = [
      event.toolServer ? `server ${event.toolServer}` : '',
      event.toolName ? `tool ${event.toolName}` : '',
      event.argumentKeys.length ? `arg keys ${event.argumentKeys.join(', ')}` : '',
      Number.isFinite(event.argumentCount) ? `arg count ${event.argumentCount}` : '',
      typeof event.success === 'boolean' ? `success ${event.success}` : '',
      Number.isFinite(event.durationMs) ? `duration ${formatLatency(event.durationMs)}` : '',
      event.status ? `status ${event.status}` : '',
      event.schemaId ? `schema ${event.schemaId}` : ''
    ].filter(Boolean);
    if (metadataValues.length) {
      const metadata = document.createElement('div');
      metadata.className = 'apg-event-metadata';
      metadataValues.forEach((value) => { const span = document.createElement('span'); span.textContent = value; metadata.append(span); });
      body.append(metadata);
    }
    article.append(marker, body);
    fragment.append(article);
  });
  elements.activityTimeline.append(fragment);
  elements.activityTimeline.scrollTop = elements.activityTimeline.scrollHeight;
  elements.streamStatus.textContent = state.streamStatus === 'connected' ? 'SSE connected' : state.streamStatus === 'connecting' ? 'Connecting…' : state.streamStatus === 'disconnected' ? 'Disconnected' : state.streamStatus === 'complete' ? 'Stream complete' : 'Idle';
  elements.reconnectButton.hidden = state.streamStatus !== 'disconnected' || !state.activeRunId || isTerminalRunStatus(state.runStatus);
}

function eventIdentity(event) {
  return event.id || `${event.sequence ?? ''}:${event.type}:${event.timestamp}:${event.toolServer}:${event.toolName}`;
}

function appendRunEvent(projected) {
  const event = normalizeStoredEvent({ ...projected, receivedAt: Date.now() });
  if (!event) return;
  const identity = eventIdentity(event);
  if (state.events.some((item) => eventIdentity(item) === identity)) return;
  state.events.push(event);
  state.events = state.events.slice(-MAX_EVENTS);
  if (event.id) state.lastEventId = event.id;
  if (event.type === 'run.queued') state.runStatus = 'queued';
  else if (['run.started', 'turn.started', 'tool.started', 'tool.progress', 'tool.completed', 'output.received', 'output.validating', 'output.validated'].includes(event.type)) state.runStatus = 'running';
  else if (event.type === 'run.completed') state.runStatus = 'completed';
  else if (event.type === 'run.failed') state.runStatus = 'failed';
  else if (event.type === 'run.cancelled') state.runStatus = 'cancelled';
  if (event.type === 'output.validating') state.validationStatus = 'validating';
  if (event.type === 'output.validated') state.validationStatus = event.success === false ? 'failed' : 'validated';
  renderActivity();
  renderResult();
  saveWorkbenchState();
  if (isTerminalRunStatus(state.runStatus)) finalizeObservableRun(state.activeRunId, state.streamEpoch);
}

function primitiveTreeValue(value) {
  const span = document.createElement('span');
  if (value === null) { span.className = 'apg-tree-null'; span.textContent = 'null'; }
  else if (typeof value === 'string') { span.className = 'apg-tree-string'; span.textContent = JSON.stringify(value); }
  else if (typeof value === 'number') { span.className = 'apg-tree-number'; span.textContent = String(value); }
  else { span.className = 'apg-tree-boolean'; span.textContent = String(value); }
  return span;
}

function treeNode(key, value, depth = 0) {
  const li = document.createElement('li');
  const keySpan = document.createElement('span');
  keySpan.className = 'apg-tree-key';
  keySpan.textContent = key;
  if (value && typeof value === 'object') {
    const details = document.createElement('details');
    details.open = depth < 2;
    const summary = document.createElement('summary');
    const type = document.createElement('span');
    type.className = 'apg-tree-type';
    type.textContent = Array.isArray(value) ? `Array(${value.length})` : `Object(${Object.keys(value).length})`;
    summary.append(keySpan, type);
    const list = document.createElement('ul');
    Object.entries(value).forEach(([childKey, childValue]) => list.append(treeNode(childKey, childValue, depth + 1)));
    details.append(summary, list);
    li.append(details);
  } else {
    li.append(keySpan, document.createTextNode(': '), primitiveTreeValue(value));
  }
  return li;
}

function normalizedResultOutput() {
  if (!state.result) return { value: null, malformed: false };
  const output = state.result.output;
  if (typeof output !== 'string') return { value: output, malformed: false };
  if (!state.result.schemaId) return { value: output, malformed: false };
  try { return { value: JSON.parse(output), malformed: false }; } catch (_) { return { value: output, malformed: true }; }
}

function renderResultTabs() {
  elements.resultTabs.forEach((button) => {
    const active = button.dataset.resultTab === state.resultTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  elements.resultTree.hidden = state.resultTab !== 'tree';
  elements.resultJson.hidden = state.resultTab !== 'json';
}

function renderResult() {
  renderResultTabs();
  elements.resultSchemaId.textContent = state.result?.schemaId || state.selectedOutputSchemaId || 'Not requested';
  const normalized = normalizedResultOutput();
  const validation = normalized.malformed ? 'Malformed output' : state.result?.validationStatus || (state.selectedOutputSchemaId ? state.validationStatus : 'Not requested');
  elements.resultValidation.textContent = humanizeFeature(validation);
  elements.resultRunStatus.textContent = humanizeFeature(state.result?.runStatus || state.runStatus || 'idle');
  elements.resultDuration.textContent = formatLatency(state.result?.durationMs ?? null);
  elements.resultStatus.textContent = state.result ? (normalized.malformed ? 'Malformed result' : 'Result available') : 'No result';
  elements.copyResultButton.disabled = !state.result;
  elements.resultTree.replaceChildren();
  if (!state.result) {
    const empty = document.createElement('div');
    empty.className = 'apg-contract-empty';
    empty.textContent = 'A completed structured run will appear here as an inspectable tree.';
    elements.resultTree.append(empty);
    elements.resultJson.textContent = 'No structured result.';
    return;
  }
  const root = document.createElement('div');
  root.className = 'apg-json-tree';
  const list = document.createElement('ul');
  if (normalized.value && typeof normalized.value === 'object') {
    Object.entries(normalized.value).forEach(([key, value]) => list.append(treeNode(key, value)));
  } else {
    list.append(treeNode('output', normalized.value));
  }
  root.append(list);
  elements.resultTree.append(root);
  elements.resultJson.textContent = JSON.stringify(normalized.value, null, 2);
}

function setResult({ output, schemaId = '', runStatus = 'completed', durationMs = null, validationStatus = 'not_requested' }) {
  state.result = { output, schemaId, runStatus, durationMs, validationStatus };
  state.validationStatus = validationStatus;
  renderResult();
  saveWorkbenchState();
}

function describeRuntimeError(error) {
  if (error instanceof AgentRuntimeError) return error.message;
  if (getFirebaseAuthErrorCode(error).startsWith('auth/')) return 'Firebase could not refresh the authenticated session. Sign in again and retry.';
  return 'The Agent Runtime failed unexpectedly. Try again.';
}

function addRunFailureNotice(runId, message) {
  if (state.history.some((item) => item.role === 'notice' && item.runId === runId)) return;
  addMessage({ role: 'notice', content: message, runId });
}

async function finalizeObservableRun(runId, epoch) {
  if (!runId || state.isFinalizing || epoch !== state.streamEpoch || !state.runtimeClient) return;
  state.isFinalizing = true;
  try {
    const snapshot = await state.runtimeClient.getObservableRun(runId);
    if (epoch !== state.streamEpoch || snapshot.run_id !== runId) return;
    state.runStatus = snapshot.status;
    if (!isTerminalRunStatus(snapshot.status)) return;
    if (snapshot.session_id) state.sessionId = snapshot.session_id;
    const validation = snapshot.output_schema_id ? (state.validationStatus === 'validated' ? 'validated' : state.validationStatus === 'failed' ? 'failed' : 'completed') : 'not_requested';
    if (snapshot.output !== null) {
      setResult({ output: snapshot.output, schemaId: snapshot.output_schema_id, runStatus: snapshot.status, durationMs: snapshot.duration_ms, validationStatus: validation });
      if (!state.history.some((item) => item.role === 'agent' && item.runId === runId)) {
        addMessage({ role: 'agent', content: formatOutput(snapshot.output), turnId: snapshot.turn_id, runId, schemaId: snapshot.output_schema_id, durationMs: snapshot.duration_ms });
      }
    } else if (snapshot.status === 'failed') {
      addRunFailureNotice(runId, snapshot.error?.message || 'The observable Agent Runtime run failed.');
    } else if (snapshot.status === 'cancelled') {
      addRunFailureNotice(runId, 'The observable run was cancelled.');
    }
    state.isRunning = false;
    state.streamStatus = 'complete';
    state.streamController?.abort();
    saveConversationState();
    saveWorkbenchState();
    renderMetadata();
    renderActivity();
    renderResult();
    renderControls();
    setRuntimeStatus(snapshot.status === 'completed' ? 'completed' : snapshot.status === 'cancelled' ? 'auth-required' : 'error', snapshot.status === 'completed' ? 'Completed' : snapshot.status === 'cancelled' ? 'Cancelled' : 'Run failed');
  } catch (error) {
    if (error?.name !== 'AbortError') {
      state.runStatus = 'reconciliation_required';
      state.streamStatus = 'disconnected';
      state.isRunning = false;
      saveWorkbenchState();
      renderMetadata();
      renderActivity();
      renderControls();
      showAlert('Run reconciliation failed', `${describeRuntimeError(error)} Retry to fetch the durable run snapshot.`, 'error');
    }
  } finally {
    state.isFinalizing = false;
  }
}

function scheduleReconnect(runId, epoch) {
  if (epoch !== state.streamEpoch || isTerminalRunStatus(state.runStatus)) return;
  if (state.reconnectAttempt >= 3) {
    state.streamStatus = 'disconnected';
    state.isRunning = false;
    renderActivity();
    renderControls();
    showAlert('Event stream disconnected', 'The run may still be active. Reconnect the durable event stream or inspect the run again.', 'error');
    return;
  }
  const delay = [750, 1500, 3000][state.reconnectAttempt++] || 3000;
  state.streamStatus = 'connecting';
  renderActivity();
  setTimeout(() => { if (epoch === state.streamEpoch) monitorObservableRun(runId, epoch); }, delay);
}

async function monitorObservableRun(runId, epoch = state.streamEpoch) {
  if (!runId || !state.runtimeClient || epoch !== state.streamEpoch) return;
  state.streamController?.abort();
  state.streamController = new AbortController();
  state.streamStatus = 'connecting';
  state.isRunning = true;
  renderActivity();
  renderControls();
  try {
    await state.runtimeClient.streamRunEvents(runId, {
      signal: state.streamController.signal,
      lastEventId: state.lastEventId,
      onOpen: () => {
        if (epoch !== state.streamEpoch) return;
        state.streamStatus = 'connected';
        state.reconnectAttempt = 0;
        hideAlert();
        renderActivity();
      },
      onEvent: appendRunEvent
    });
    if (epoch !== state.streamEpoch) return;
    await finalizeObservableRun(runId, epoch);
    if (!isTerminalRunStatus(state.runStatus)) scheduleReconnect(runId, epoch);
  } catch (error) {
    if (epoch !== state.streamEpoch || error?.name === 'AbortError') return;
    try {
      const snapshot = await state.runtimeClient.getObservableRun(runId);
      state.runStatus = snapshot.status;
      if (isTerminalRunStatus(snapshot.status)) return finalizeObservableRun(runId, epoch);
    } catch (_) {}
    scheduleReconnect(runId, epoch);
  }
}

function resetRunInspector() {
  state.streamEpoch += 1;
  state.streamController?.abort();
  state.streamController = null;
  state.activeRunId = '';
  state.runStatus = 'idle';
  state.streamStatus = 'idle';
  state.lastEventId = '';
  state.events = [];
  state.result = null;
  state.validationStatus = state.selectedOutputSchemaId ? 'pending' : 'not_requested';
  state.reconnectAttempt = 0;
  renderActivity();
  renderResult();
  renderMetadata();
}

async function runQuickTurn(input) {
  state.isRunning = true;
  state.runStatus = 'running';
  state.streamStatus = 'idle';
  elements.activityEmpty.textContent = 'Quick turns use POST /v1/agent/run and do not expose an SSE lifecycle.';
  setRuntimeStatus('running', 'Quick turn running');
  renderControls();
  try {
    const result = await state.runtimeClient.run({
      input,
      sessionId: state.sessionId,
      outputSchemaId: state.selectedOutputSchemaId,
      toolProfileId: state.selectedToolProfileId
    });
    state.sessionId = result.session_id;
    state.runStatus = 'completed';
    const validation = result.output_schema_id ? 'completed' : 'not_requested';
    setResult({ output: result.output, schemaId: result.output_schema_id, runStatus: result.status, durationMs: result.duration_ms, validationStatus: validation });
    addMessage({ role: 'agent', content: formatOutput(result.output), turnId: result.turn_id, schemaId: result.output_schema_id, durationMs: result.duration_ms });
    setRuntimeStatus('completed', 'Completed');
  } catch (error) {
    const message = describeRuntimeError(error);
    state.runStatus = 'failed';
    addMessage({ role: 'notice', content: message });
    showAlert('Execution failed', message, 'error');
    setRuntimeStatus('error', error?.code === 'timeout' ? 'Timed out' : 'Runtime error');
  } finally {
    state.isRunning = false;
    saveConversationState();
    saveWorkbenchState();
    renderMetadata();
    renderResult();
    renderControls();
    elements.promptInput.focus();
  }
}

async function runObservable(input) {
  resetRunInspector();
  state.isRunning = true;
  state.runStatus = 'submitting';
  state.validationStatus = state.selectedOutputSchemaId ? 'pending' : 'not_requested';
  setRuntimeStatus('running', 'Submitting run');
  renderControls();
  try {
    const created = await state.runtimeClient.createObservableRun({
      input,
      sessionId: state.sessionId,
      outputSchemaId: state.selectedOutputSchemaId,
      toolProfileId: state.selectedToolProfileId
    });
    state.activeRunId = created.run_id;
    state.runStatus = created.status;
    state.streamEpoch += 1;
    saveWorkbenchState();
    renderMetadata();
    setRuntimeStatus('running', 'Observable run active');
    monitorObservableRun(created.run_id, state.streamEpoch);
  } catch (error) {
    const message = describeRuntimeError(error);
    state.isRunning = false;
    state.runStatus = 'failed';
    addMessage({ role: 'notice', content: message });
    showAlert('Run submission failed', message, 'error');
    setRuntimeStatus('error', 'Submission failed');
    renderControls();
    saveWorkbenchState();
  }
}

async function executeMission(input) {
  if (state.isRunning || !state.currentUser || !state.runtimeClient) return;
  hideAlert();
  state.executionMode = currentExecutionMode();
  addMessage({ role: 'user', content: input });
  elements.promptInput.value = '';
  saveWorkbenchState();
  if (state.executionMode === 'quick') await runQuickTurn(input);
  else await runObservable(input);
}

async function cancelActiveRun() {
  if (!state.activeRunId || !state.runtimeClient || !state.isRunning) return;
  elements.cancelRunButton.disabled = true;
  state.runStatus = 'cancelling';
  setRuntimeStatus('running', 'Cancelling');
  renderControls();
  try {
    const cancelled = await state.runtimeClient.cancelObservableRun(state.activeRunId);
    state.runStatus = cancelled.status || 'cancelling';
    saveWorkbenchState();
    if (isTerminalRunStatus(state.runStatus)) await finalizeObservableRun(state.activeRunId, state.streamEpoch);
  } catch (error) {
    showAlert('Cancellation failed', describeRuntimeError(error), 'error');
    state.runStatus = 'running';
    renderControls();
  }
}

function resetSession() {
  if (state.isRunning) return;
  state.sessionId = '';
  state.history = [];
  resetRunInspector();
  try {
    localStorage.removeItem(STORAGE_KEYS.sessionId);
    localStorage.removeItem(STORAGE_KEYS.conversation);
  } catch (_) {}
  saveWorkbenchState();
  hideAlert();
  renderConversation();
  renderMetadata();
  if (state.authState === 'unavailable') {
    showAlert('Firebase unavailable', 'Authentication could not be initialized. Open this page from the deployed Firebase Hosting origin and reload.', 'error');
    setRuntimeStatus('error', 'Auth unavailable');
  } else if (state.currentUser) setRuntimeStatus('ready', 'Ready');
  else {
    showAlert('Authentication required', 'Sign in with Google to authorize Agent Runtime requests with a Firebase ID token.');
    setRuntimeStatus('auth-required', 'Sign-in required');
  }
  renderControls();
  elements.promptInput.focus();
}

async function handleAuthAction() {
  if (!state.firebaseClient || state.authState === 'unavailable') return;
  if (state.currentUser) {
    try { await state.firebaseClient.authMod.signOut(state.firebaseClient.auth); } catch (_) {
      showAlert('Sign-out failed', 'Firebase could not close the current session.', 'error');
    }
    return;
  }
  state.authState = 'authenticating';
  renderAuth();
  try { await signInWithGoogle(state.firebaseClient); } catch (_) {
    state.authState = 'signed-out';
    renderAuth();
    showAlert('Sign-in incomplete', 'Google sign-in did not complete. Please try again.', 'error');
    setRuntimeStatus('auth-required', 'Sign-in required');
  }
}

async function resumePersistedRun() {
  if (!state.activeRunId || !state.runtimeClient) return;
  state.streamEpoch += 1;
  const epoch = state.streamEpoch;
  try {
    const snapshot = await state.runtimeClient.getObservableRun(state.activeRunId);
    state.runStatus = snapshot.status;
    if (isTerminalRunStatus(snapshot.status)) await finalizeObservableRun(state.activeRunId, epoch);
    else monitorObservableRun(state.activeRunId, epoch);
  } catch (error) {
    state.streamStatus = 'disconnected';
    state.isRunning = false;
    renderActivity();
    renderControls();
    showAlert('Saved run unavailable', describeRuntimeError(error), 'error');
  }
}

async function initializeAuth() {
  try {
    state.firebaseClient = await getFirebaseBrowserAuthClient();
    state.runtimeClient = createAgentRuntimeClient({
      getIdToken: async (forceRefresh = false) => {
        if (!state.currentUser) throw new AgentRuntimeError('auth_missing', 'Sign in with Firebase before using the runtime.', 401);
        return state.currentUser.getIdToken(forceRefresh === true);
      }
    });
    state.firebaseClient.authMod.onAuthStateChanged(state.firebaseClient.auth, async (user) => {
      state.currentUser = user || null;
      state.authState = user ? 'authenticated' : 'signed-out';
      renderAuth();
      if (user) {
        hideAlert();
        setRuntimeStatus('ready', state.sessionId ? 'Session ready' : 'Ready');
        await loadRegistry();
        if (state.activeRunId) await resumePersistedRun();
      } else {
        state.streamEpoch += 1;
        state.streamController?.abort();
        state.isRunning = false;
        showAlert('Authentication required', 'Sign in with Google to authorize Agent Runtime requests with a Firebase ID token.');
        setRuntimeStatus('auth-required', 'Sign-in required');
      }
    });
  } catch (_) {
    state.authState = 'unavailable';
    renderAuth();
    showAlert('Firebase unavailable', 'Authentication could not be initialized. Open this page from the deployed Firebase Hosting origin and reload.', 'error');
    setRuntimeStatus('error', 'Auth unavailable');
  }
}

async function copyResult() {
  if (!state.result) return;
  const text = elements.resultJson.textContent;
  try {
    await navigator.clipboard.writeText(text);
    const previous = elements.copyResultButton.textContent;
    elements.copyResultButton.textContent = 'Copied';
    setTimeout(() => { elements.copyResultButton.textContent = previous; }, 1400);
  } catch (_) { showAlert('Copy unavailable', 'The browser could not copy the final JSON result.', 'error'); }
}

function renderDraft() {
  elements.draftSchemaInput.value = state.draftText;
  elements.toggleDraftButton.textContent = elements.draftEditorRegion.hidden ? '+ Add Draft Schema' : 'Close Draft Editor';
}

function validateDraft() {
  const text = elements.draftSchemaInput.value.trim();
  elements.draftValidationStatus.className = '';
  if (!text) {
    elements.draftValidationStatus.textContent = 'Paste a JSON Schema object to validate.';
    elements.draftValidationStatus.classList.add('is-invalid');
    return;
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('root_object_required');
    elements.draftValidationStatus.textContent = 'Valid JSON object · local draft only · not registered';
    elements.draftValidationStatus.classList.add('is-valid');
  } catch (error) {
    elements.draftValidationStatus.textContent = error instanceof SyntaxError ? `Invalid JSON · ${error.message}` : 'Invalid draft · the schema root must be a JSON object';
    elements.draftValidationStatus.classList.add('is-invalid');
  }
}

elements.promptForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = elements.promptInput.value.trim();
  if (input) executeMission(input);
});
elements.promptInput.addEventListener('input', renderControls);
elements.promptInput.addEventListener('keydown', (event) => {
  if (!event.isComposing && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (!elements.runButton.disabled) elements.promptForm.requestSubmit();
  }
});
elements.executionModes.forEach((input) => input.addEventListener('change', () => {
  state.executionMode = currentExecutionMode();
  saveWorkbenchState();
  renderControls();
}));
elements.newSessionButton.addEventListener('click', resetSession);
elements.authButton.addEventListener('click', handleAuthAction);
elements.refreshRegistryButton.addEventListener('click', loadRegistry);
elements.toolProfileSelect.addEventListener('change', () => {
  state.selectedToolProfileId = elements.toolProfileSelect.value;
  state.contractTab = 'tool';
  saveWorkbenchState();
  renderRegistry();
  loadSelectedToolProfile();
});
elements.outputSchemaSelect.addEventListener('change', () => {
  state.selectedOutputSchemaId = elements.outputSchemaSelect.value;
  state.validationStatus = state.selectedOutputSchemaId ? 'pending' : 'not_requested';
  state.contractTab = 'schema';
  saveWorkbenchState();
  renderRegistry();
  renderResult();
  loadSelectedOutputSchema();
});
elements.contractTabs.forEach((button) => button.addEventListener('click', () => {
  state.contractTab = button.dataset.contractTab;
  saveWorkbenchState();
  renderContractDetail();
}));
elements.resultTabs.forEach((button) => button.addEventListener('click', () => {
  state.resultTab = button.dataset.resultTab;
  saveWorkbenchState();
  renderResultTabs();
}));
elements.cancelRunButton.addEventListener('click', cancelActiveRun);
elements.reconnectButton.addEventListener('click', () => {
  if (!state.activeRunId) return;
  state.reconnectAttempt = 0;
  hideAlert();
  resumePersistedRun();
});
elements.copyResultButton.addEventListener('click', copyResult);
elements.toggleDraftButton.addEventListener('click', () => {
  elements.draftEditorRegion.hidden = !elements.draftEditorRegion.hidden;
  renderDraft();
  if (!elements.draftEditorRegion.hidden) elements.draftSchemaInput.focus();
});
elements.draftSchemaInput.addEventListener('input', () => {
  state.draftText = elements.draftSchemaInput.value;
  elements.draftValidationStatus.textContent = 'Not validated';
  elements.draftValidationStatus.className = '';
  saveWorkbenchState();
});
elements.validateDraftButton.addEventListener('click', validateDraft);
elements.clearDraftButton.addEventListener('click', () => {
  state.draftText = '';
  elements.draftSchemaInput.value = '';
  elements.draftValidationStatus.textContent = 'Not validated';
  elements.draftValidationStatus.className = '';
  saveWorkbenchState();
});

elements.executionModes.forEach((input) => { input.checked = input.value === state.executionMode; });
renderConversation();
renderMetadata();
renderAuth();
renderRegistry();
renderActivity();
renderResult();
renderDraft();
initializeAuth();
