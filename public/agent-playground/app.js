import { getFirebaseBrowserAuthClient, getFirebaseAuthErrorCode, signInWithGoogle } from '../firebase-auth-client.mjs';
import {
  AgentRuntimeError,
  PUBLIC_AGENT_EVENT_TYPES,
  createAgentDefinitionPatchRequest,
  createAgentRuntimeClient,
  isTerminalRunStatus,
  isAgentTestContextCurrent,
  resolveModelRegistrySelection,
  validateAgentDefinitionRegistries
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
  agentSelect: document.getElementById('agentSelect'),
  newAgentButton: document.getElementById('newAgentButton'),
  reloadAgentButton: document.getElementById('reloadAgentButton'),
  saveAgentButton: document.getElementById('saveAgentButton'),
  agentStatus: document.getElementById('agentStatus'),
  agentResourceStatus: document.getElementById('agentResourceStatus'),
  agentRevision: document.getElementById('agentRevision'),
  agentId: document.getElementById('agentId'),
  agentForm: document.getElementById('agentForm'),
  agentNameInput: document.getElementById('agentNameInput'),
  agentInstructionsInput: document.getElementById('agentInstructionsInput'),
  agentFormNotice: document.getElementById('agentFormNotice'),
  conversation: document.getElementById('conversation'),
  emptyState: document.getElementById('emptyState'),
  conversationTurnCount: document.getElementById('conversationTurnCount'),
  conversationTurnLabel: document.getElementById('conversationTurnLabel'),
  promptForm: document.getElementById('promptForm'),
  promptInput: document.getElementById('promptInput'),
  runButton: document.getElementById('runButton'),
  runButtonLabel: document.getElementById('runButtonLabel'),
  registryStatus: document.getElementById('registryStatus'),
  refreshRegistryButton: document.getElementById('refreshRegistryButton'),
  modelSelect: document.getElementById('modelSelect'),
  reasoningEffortSelect: document.getElementById('reasoningEffortSelect'),
  modelDescription: document.getElementById('modelDescription'),
  reasoningEffortDescription: document.getElementById('reasoningEffortDescription'),
  modelSelectionNotice: document.getElementById('modelSelectionNotice'),
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
const hasRestoredTestBinding = Boolean(restoredWorkbench.testAgentId && restoredWorkbench.testAgentRevision);
const state = {
  sessionId: hasRestoredTestBinding ? loadSessionId() : '',
  history: hasRestoredTestBinding ? loadHistory() : [],
  firebaseClient: null,
  currentUser: null,
  runtimeClient: null,
  authState: 'initializing',
  runtimeState: 'initializing',
  isRunning: false,
  isFinalizing: false,
  registryState: 'idle',
  outputSchemaRegistryState: 'idle',
  toolProfileRegistryState: 'idle',
  modelRegistryState: 'idle',
  modelRegistryError: '',
  modelCatalog: null,
  capabilities: null,
  outputSchemas: [],
  toolProfiles: [],
  outputSchemaDetail: null,
  toolProfileDetail: null,
  agentsState: 'idle',
  agentsError: '',
  agents: [],
  selectedAgentId: restoredWorkbench.selectedAgentId,
  selectedAgent: null,
  conflictServerAgent: null,
  agentMode: 'none',
  saveState: 'idle',
  agentForm: { name: '', model: '', reasoningEffort: '', instructions: '', toolProfileId: '', outputSchemaId: '' },
  testAgentId: restoredWorkbench.testAgentId,
  testAgentRevision: restoredWorkbench.testAgentRevision,
  modelSelectionNotice: '',
  modelSelectionNoticeTone: 'warning',
  contractTab: restoredWorkbench.contractTab,
  resultTab: restoredWorkbench.resultTab,
  activeRunId: hasRestoredTestBinding ? restoredWorkbench.activeRunId : '',
  runStatus: hasRestoredTestBinding ? restoredWorkbench.runStatus : 'idle',
  streamStatus: 'idle',
  streamController: null,
  streamEpoch: 0,
  reconnectAttempt: 0,
  lastEventId: hasRestoredTestBinding ? restoredWorkbench.lastEventId : '',
  events: hasRestoredTestBinding ? restoredWorkbench.events : [],
  result: hasRestoredTestBinding ? restoredWorkbench.result : null,
  validationStatus: hasRestoredTestBinding ? restoredWorkbench.validationStatus : 'not_requested',
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
    selectedAgentId: '', testAgentId: '', testAgentRevision: null,
    contractTab: 'capabilities', resultTab: 'tree', activeRunId: '', runStatus: 'idle',
    lastEventId: '', events: [], result: null, validationStatus: 'not_requested', draftText: ''
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.workbench) || '{}');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      selectedAgentId: String(parsed.selectedAgentId || '').slice(0, 256),
      testAgentId: String(parsed.testAgentId || '').slice(0, 256),
      testAgentRevision: Number.isInteger(parsed.testAgentRevision) && parsed.testAgentRevision > 0 ? parsed.testAgentRevision : null,
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
    selectedAgentId: state.selectedAgentId,
    testAgentId: state.testAgentId,
    testAgentRevision: state.testAgentRevision,
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

function agentFormProjection() {
  return {
    name: state.agentForm.name.trim(),
    model: state.agentForm.model,
    reasoning: { effort: state.agentForm.reasoningEffort },
    instructions: state.agentForm.instructions,
    tool_profile_id: state.agentForm.toolProfileId || null,
    output_schema_id: state.agentForm.outputSchemaId || null
  };
}

function agentFormIsDirty() {
  if (state.agentMode === 'new') return Boolean(state.agentForm.name || state.agentForm.model || state.agentForm.reasoningEffort
    || state.agentForm.instructions || state.agentForm.toolProfileId || state.agentForm.outputSchemaId);
  if (!state.selectedAgent) return false;
  const form = agentFormProjection();
  return form.name !== state.selectedAgent.name || form.model !== state.selectedAgent.model
    || form.reasoning.effort !== state.selectedAgent.reasoning.effort || form.instructions !== state.selectedAgent.instructions
    || form.tool_profile_id !== state.selectedAgent.tool_profile_id || form.output_schema_id !== state.selectedAgent.output_schema_id;
}

function currentAgentRegistryValidation() {
  return validateAgentDefinitionRegistries(state.agentForm, state.modelCatalog,
    state.toolProfileRegistryState === 'ready' ? state.toolProfiles : null,
    state.outputSchemaRegistryState === 'ready' ? state.outputSchemas : null);
}

function renderControls() {
  const authenticated = state.authState === 'authenticated';
  const hasPrompt = Boolean(elements.promptInput.value.trim());
  const hasForm = state.agentMode !== 'none';
  const registryValidation = currentAgentRegistryValidation();
  const dirty = agentFormIsDirty();
  const conflicted = state.saveState === 'conflict';
  const canSave = authenticated && hasForm && !state.isRunning && state.saveState !== 'saving' && !conflicted
    && Boolean(state.agentForm.name.trim()) && registryValidation.valid && (state.agentMode === 'new' || dirty);
  const canTest = authenticated && hasPrompt && !state.isRunning && state.agentMode === 'existing'
    && Boolean(state.selectedAgent) && !dirty && !conflicted && registryValidation.valid;
  elements.runButton.disabled = !canTest;
  elements.runButton.classList.toggle('is-busy', state.isRunning);
  elements.promptInput.disabled = state.isRunning || state.agentMode !== 'existing';
  elements.runButtonLabel.textContent = dirty ? 'Save Draft to Test' : 'Test Agent';
  elements.newSessionButton.disabled = state.isRunning || (!state.sessionId && !state.activeRunId && state.history.length === 0);
  elements.authButton.disabled = ['initializing', 'authenticating', 'unavailable'].includes(state.authState) || state.isRunning;
  const toolRegistryReady = state.toolProfileRegistryState === 'ready';
  const schemaRegistryReady = state.outputSchemaRegistryState === 'ready';
  const modelRegistryReady = state.modelRegistryState === 'ready' && Boolean(state.modelCatalog?.items?.length);
  const selectedModel = state.modelCatalog?.items?.find((item) => item.id === state.agentForm.model) || null;
  const formLocked = !authenticated || !hasForm || state.isRunning || state.saveState === 'saving' || conflicted;
  elements.agentNameInput.disabled = formLocked;
  elements.agentInstructionsInput.disabled = formLocked;
  elements.toolProfileSelect.disabled = formLocked || !toolRegistryReady;
  elements.outputSchemaSelect.disabled = formLocked || !schemaRegistryReady;
  elements.modelSelect.disabled = formLocked || !modelRegistryReady;
  elements.reasoningEffortSelect.disabled = formLocked || !modelRegistryReady || !selectedModel;
  elements.agentSelect.disabled = !authenticated || state.agentsState !== 'ready' || state.isRunning || state.saveState === 'saving' || conflicted;
  elements.newAgentButton.disabled = !authenticated || state.agentsState !== 'ready' || state.isRunning || state.saveState === 'saving' || conflicted;
  elements.saveAgentButton.disabled = !canSave;
  elements.reloadAgentButton.hidden = !conflicted;
  elements.reloadAgentButton.disabled = state.saveState === 'saving' || state.isRunning;
  elements.refreshRegistryButton.disabled = !authenticated || state.registryState === 'loading' || state.modelRegistryState === 'loading' || state.isRunning || state.saveState === 'saving';
  elements.cancelRunButton.hidden = !state.isRunning || !state.activeRunId;
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

function setAgentFormFromResource(agent) {
  state.agentForm = {
    name: agent.name,
    model: agent.model,
    reasoningEffort: agent.reasoning.effort,
    instructions: agent.instructions,
    toolProfileId: agent.tool_profile_id || '',
    outputSchemaId: agent.output_schema_id || ''
  };
}

function replaceAgentOptions() {
  elements.agentSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  if (state.agentsState === 'loading') placeholder.textContent = 'Loading Agents…';
  else if (state.agentsState === 'error') placeholder.textContent = 'Agent list unavailable';
  else if (state.agentsState === 'ready' && !state.agents.length) placeholder.textContent = 'No saved Agents';
  else placeholder.textContent = 'Choose a saved Agent';
  elements.agentSelect.append(placeholder);
  state.agents.forEach((agent) => {
    const option = document.createElement('option');
    option.value = agent.agent_id;
    option.textContent = `${agent.name} · r${agent.revision}`;
    elements.agentSelect.append(option);
  });
  elements.agentSelect.value = state.agentMode === 'existing' && state.agents.some((agent) => agent.agent_id === state.selectedAgentId)
    ? state.selectedAgentId : '';
}

function renderAgentDefinition() {
  replaceAgentOptions();
  elements.agentNameInput.value = state.agentForm.name;
  elements.agentInstructionsInput.value = state.agentForm.instructions;
  elements.agentResourceStatus.textContent = state.selectedAgent?.status || (state.agentMode === 'new' ? 'draft' : '—');
  elements.agentRevision.textContent = state.selectedAgent ? String(state.selectedAgent.revision) : '—';
  elements.agentId.textContent = state.selectedAgent?.agent_id || 'Unsaved';
  elements.agentId.title = state.selectedAgent?.agent_id || 'This draft has not been saved';

  const dirty = agentFormIsDirty();
  const validation = currentAgentRegistryValidation();
  if (state.agentsState === 'loading') {
    elements.agentStatus.textContent = 'Loading Agents…';
    elements.agentFormNotice.textContent = 'Loading server-backed Draft Agents.';
  } else if (state.agentsState === 'error') {
    elements.agentStatus.textContent = 'Agent discovery failed';
    elements.agentFormNotice.textContent = state.agentsError || 'The Agent list could not be loaded.';
  } else if (state.saveState === 'conflict') {
    elements.agentStatus.textContent = 'Revision conflict';
    elements.agentFormNotice.textContent = state.conflictServerAgent
      ? `The server is at revision ${state.conflictServerAgent.revision}. Your local edits are preserved; reload the latest revision before continuing.`
      : 'The server revision changed. Your local edits are preserved; reload the latest revision before continuing.';
  } else if (state.saveState === 'saving') {
    elements.agentStatus.textContent = 'Saving…';
    elements.agentFormNotice.textContent = 'Saving this definition to the server.';
  } else if (state.agentMode === 'none') {
    elements.agentStatus.textContent = 'No Agent selected';
    elements.agentFormNotice.textContent = state.agents.length ? 'Choose a saved Agent or start a new Draft.' : 'Choose or create a Draft Agent to begin.';
  } else if (!validation.valid) {
    elements.agentStatus.textContent = 'Configuration unavailable';
    elements.agentFormNotice.textContent = registryValidationMessage(validation.errors);
  } else if (state.agentMode === 'new') {
    elements.agentStatus.textContent = dirty ? 'Unsaved Draft' : 'New Draft';
    elements.agentFormNotice.textContent = 'Complete the definition and save it before testing.';
  } else {
    elements.agentStatus.textContent = dirty ? `Unsaved changes · r${state.selectedAgent.revision}` : `Saved · r${state.selectedAgent.revision}`;
    elements.agentFormNotice.textContent = dirty ? 'Save these changes before testing the Agent.' : 'This saved revision is ready to test.';
  }
  elements.agentFormNotice.classList.toggle('is-error', state.saveState === 'conflict' || state.agentsState === 'error' || (state.agentMode !== 'none' && !validation.valid));
  renderControls();
}

function registryValidationMessage(errors) {
  const copy = {
    model_catalog_unavailable: 'The live model registry is unavailable.',
    model_unavailable: `Saved model “${state.agentForm.model || 'none'}” is not advertised by the runtime. Choose a supported model.`,
    reasoning_effort_unavailable: `Reasoning effort “${state.agentForm.reasoningEffort || 'none'}” is not supported by the selected model. Choose an advertised effort.`,
    tool_profile_registry_unavailable: 'The Tool Profile registry is unavailable.',
    tool_profile_unavailable: `Saved Tool Profile “${state.agentForm.toolProfileId}” is no longer advertised. Choose an available profile or No tools.`,
    output_schema_registry_unavailable: 'The Output Schema registry is unavailable.',
    output_schema_unavailable: `Saved Output Schema “${state.agentForm.outputSchemaId}” is no longer advertised. Choose an available schema or Free text.`
  };
  return errors.map((code) => copy[code] || 'The Agent configuration is invalid.').join(' ');
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
  if (selectedId && !items.some((item) => item.id === selectedId)) {
    const unavailable = document.createElement('option');
    unavailable.value = selectedId;
    unavailable.textContent = `${selectedId} · Unavailable`;
    select.append(unavailable);
  }
  select.value = selectedId || '';
}

function overallRegistryState() {
  if (state.authState !== 'authenticated') return 'idle';
  if (state.registryState === 'loading' || state.modelRegistryState === 'loading') return 'loading';
  if (state.registryState === 'ready' && state.modelRegistryState === 'ready') return 'ready';
  if (state.registryState === 'error' && state.modelRegistryState === 'error') return 'error';
  if (state.registryState === 'idle' && state.modelRegistryState === 'idle') return 'idle';
  return 'partial';
}

function replaceModelOptions() {
  elements.modelSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = state.modelRegistryState === 'ready' && Boolean(state.modelCatalog?.items?.length);
  if (state.modelRegistryState === 'loading') placeholder.textContent = 'Loading models…';
  else if (state.modelRegistryState === 'error') placeholder.textContent = 'Model registry unavailable';
  else if (state.modelRegistryState === 'ready') placeholder.textContent = state.modelCatalog?.items?.length ? 'Select a model' : 'No models advertised';
  else placeholder.textContent = 'Authenticate to load models';
  elements.modelSelect.append(placeholder);

  for (const model of state.modelCatalog?.items || []) {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.display_name}${model.is_default ? ' · Default' : ''}`;
    elements.modelSelect.append(option);
  }
  if (state.agentForm.model && !state.modelCatalog?.items?.some((item) => item.id === state.agentForm.model)) {
    const unavailable = document.createElement('option');
    unavailable.value = state.agentForm.model;
    unavailable.textContent = `${state.agentForm.model} · Unavailable`;
    elements.modelSelect.append(unavailable);
  }
  elements.modelSelect.value = state.agentForm.model || '';
}

function replaceReasoningEffortOptions(selectedModel) {
  elements.reasoningEffortSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = false;
  placeholder.textContent = selectedModel ? 'Select reasoning effort' : 'Select a model first';
  elements.reasoningEffortSelect.append(placeholder);

  for (const effort of selectedModel?.supported_reasoning_efforts || []) {
    const option = document.createElement('option');
    option.value = effort.id;
    option.textContent = `${effort.id}${effort.id === selectedModel.default_reasoning_effort ? ' · Default' : ''}`;
    elements.reasoningEffortSelect.append(option);
  }
  if (state.agentForm.reasoningEffort && !selectedModel?.supported_reasoning_efforts.some((effort) => effort.id === state.agentForm.reasoningEffort)) {
    const unavailable = document.createElement('option');
    unavailable.value = state.agentForm.reasoningEffort;
    unavailable.textContent = `${state.agentForm.reasoningEffort} · Unavailable`;
    elements.reasoningEffortSelect.append(unavailable);
  }
  elements.reasoningEffortSelect.value = state.agentForm.reasoningEffort || '';
}

function renderModelRegistry() {
  replaceModelOptions();
  const selectedModel = state.modelCatalog?.items?.find((item) => item.id === state.agentForm.model) || null;
  replaceReasoningEffortOptions(selectedModel);
  const selectedEffort = selectedModel?.supported_reasoning_efforts.find((effort) => effort.id === state.agentForm.reasoningEffort) || null;

  if (state.modelRegistryState === 'loading') elements.modelDescription.textContent = 'Loading the live runtime model catalog…';
  else if (state.modelRegistryState === 'error') elements.modelDescription.textContent = 'The live model registry is unavailable.';
  else if (state.modelRegistryState === 'ready' && !state.modelCatalog?.items?.length) elements.modelDescription.textContent = 'No models are advertised by the runtime.';
  else if (selectedModel) elements.modelDescription.textContent = selectedModel.description || selectedModel.id;
  else if (state.modelRegistryState === 'ready') elements.modelDescription.textContent = 'Choose a model advertised by the live runtime registry.';
  else elements.modelDescription.textContent = 'Models load from the live runtime registry after Firebase authentication.';

  elements.reasoningEffortDescription.textContent = selectedEffort?.description
    || (selectedModel ? 'Choose an effort supported by this model.' : 'Reasoning efforts load from the selected model.');

  const notice = state.modelRegistryError || state.modelSelectionNotice;
  elements.modelSelectionNotice.hidden = !notice;
  elements.modelSelectionNotice.textContent = notice;
  elements.modelSelectionNotice.classList.toggle('is-error', state.modelRegistryState === 'error' || state.modelSelectionNoticeTone === 'error');
}

function renderRegistry() {
  const statusCopy = { idle: 'Waiting for auth', loading: 'Discovering…', ready: 'Registry ready', partial: 'Partial registry', error: 'Discovery failed' };
  const displayState = overallRegistryState();
  elements.registryStatus.textContent = statusCopy[displayState] || displayState;
  renderModelRegistry();
  replaceOptions(elements.toolProfileSelect, 'No tools', state.toolProfiles, state.agentForm.toolProfileId);
  replaceOptions(elements.outputSchemaSelect, 'Free text', state.outputSchemas, state.agentForm.outputSchemaId);
  const tool = selectedSummary(state.toolProfiles, state.agentForm.toolProfileId);
  const schema = selectedSummary(state.outputSchemas, state.agentForm.outputSchemaId);
  elements.toolProfileDescription.textContent = tool?.description
    || (state.toolProfileRegistryState === 'error' ? 'The live Tool Profile registry is unavailable.' : state.agentForm.toolProfileId ? 'This saved Tool Profile is unavailable.' : state.toolProfiles.length ? 'No controlled tool profile will be attached.' : state.registryState === 'loading' ? 'Loading approved tool profiles…' : 'No approved tool profiles are available.');
  elements.outputSchemaDescription.textContent = schema?.description
    || (state.outputSchemaRegistryState === 'error' ? 'The live Output Schema registry is unavailable.' : state.agentForm.outputSchemaId ? 'This saved Output Schema is unavailable.' : state.outputSchemas.length ? 'The runtime will return its standard text response.' : state.registryState === 'loading' ? 'Loading registered output schemas…' : 'No registered output schemas are available.');
  renderCapabilities();
  renderContractDetail();
  renderAgentDefinition();
  renderControls();
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
    emptyCopy = state.agentForm.toolProfileId ? 'Loading selected tool profile…' : 'Select an approved tool profile to inspect its public tools and policy.';
  } else {
    value = state.outputSchemaDetail;
    emptyCopy = state.agentForm.outputSchemaId ? 'Loading selected output schema…' : 'Select a registered output schema to inspect its public JSON Schema.';
  }
  elements.contractDetail.textContent = value ? JSON.stringify(value, null, 2) : emptyCopy;
}

async function loadSelectedToolProfile() {
  const id = state.agentForm.toolProfileId;
  state.toolProfileDetail = null;
  renderContractDetail();
  if (!id || !state.runtimeClient || !state.toolProfiles.some((item) => item.id === id)) return;
  try {
    const detail = await state.runtimeClient.getToolProfile(id);
    if (state.agentForm.toolProfileId === id) state.toolProfileDetail = detail;
  } catch (error) {
    if (state.agentForm.toolProfileId === id) showAlert('Tool profile unavailable', describeRuntimeError(error), 'error');
  }
  renderContractDetail();
}

async function loadSelectedOutputSchema() {
  const id = state.agentForm.outputSchemaId;
  state.outputSchemaDetail = null;
  renderContractDetail();
  if (!id || !state.runtimeClient || !state.outputSchemas.some((item) => item.id === id)) return;
  try {
    const detail = await state.runtimeClient.getOutputSchema(id);
    if (state.agentForm.outputSchemaId === id) state.outputSchemaDetail = detail;
  } catch (error) {
    if (state.agentForm.outputSchemaId === id) showAlert('Output schema unavailable', describeRuntimeError(error), 'error');
  }
  renderContractDetail();
}

function seedNewAgentDefaults() {
  if (state.agentMode !== 'new' || state.agentForm.model) return;
  const resolution = resolveModelRegistrySelection(state.modelCatalog);
  if (!resolution.errorCode) {
    state.agentForm.model = resolution.selectedModelId;
    state.agentForm.reasoningEffort = resolution.selectedReasoningEffort;
    state.modelSelectionNotice = 'This new Draft uses the defaults advertised by the live model registry.';
    state.modelSelectionNoticeTone = 'warning';
  } else if (resolution.errorCode === 'empty_catalog') {
    state.modelSelectionNotice = 'No models are advertised by the runtime.';
    state.modelSelectionNoticeTone = 'error';
  } else {
    state.modelSelectionNotice = 'No unique default model is advertised. Choose a model explicitly.';
    state.modelSelectionNoticeTone = 'error';
  }
}

async function loadRegistry() {
  if (!state.runtimeClient || !state.currentUser || state.registryState === 'loading' || state.modelRegistryState === 'loading') return;
  state.registryState = 'loading';
  state.outputSchemaRegistryState = 'loading';
  state.toolProfileRegistryState = 'loading';
  state.modelRegistryState = 'loading';
  state.modelRegistryError = '';
  state.modelCatalog = null;
  state.modelSelectionNotice = '';
  renderRegistry();
  hideAlert();
  const [capabilities, outputSchemas, toolProfiles, modelCatalog] = await Promise.allSettled([
    state.runtimeClient.getCapabilities(),
    state.runtimeClient.listOutputSchemas(),
    state.runtimeClient.listToolProfiles(),
    state.runtimeClient.getModelCatalog()
  ]);
  if (capabilities.status === 'fulfilled') state.capabilities = capabilities.value;
  if (outputSchemas.status === 'fulfilled') {
    state.outputSchemas = outputSchemas.value;
    state.outputSchemaRegistryState = 'ready';
  } else {
    state.outputSchemas = [];
    state.outputSchemaRegistryState = 'error';
  }
  if (toolProfiles.status === 'fulfilled') {
    state.toolProfiles = toolProfiles.value;
    state.toolProfileRegistryState = 'ready';
  } else {
    state.toolProfiles = [];
    state.toolProfileRegistryState = 'error';
  }
  const failures = [capabilities, outputSchemas, toolProfiles].filter((result) => result.status === 'rejected');
  state.registryState = failures.length === 0 ? 'ready' : failures.length === 3 ? 'error' : 'partial';
  if (modelCatalog.status === 'fulfilled') {
    state.modelCatalog = modelCatalog.value;
    state.modelRegistryState = 'ready';
    seedNewAgentDefaults();
  } else {
    state.modelRegistryState = 'error';
    state.modelRegistryError = describeRuntimeError(modelCatalog.reason);
  }

  const allFailures = [...failures, ...(modelCatalog.status === 'rejected' ? [modelCatalog] : [])];
  if (allFailures.length) {
    const authFailure = allFailures.find((result) => ['unauthorized', 'forbidden'].includes(result.reason?.code));
    const onlyModelFailed = failures.length === 0 && modelCatalog.status === 'rejected';
    const message = authFailure
      ? describeRuntimeError(authFailure.reason)
      : onlyModelFailed
        ? 'The model registry could not be loaded. Model configuration is unavailable; other registries remain usable. Refresh discovery to retry.'
        : 'One or more runtime registries could not be loaded. Refresh discovery to retry.';
    showAlert(authFailure ? 'Runtime authorization failed' : 'Registry discovery incomplete', message, 'error');
  }
  renderRegistry();
  await Promise.all([loadSelectedToolProfile(), loadSelectedOutputSchema()]);
}

function clearAgentTestContext() {
  state.sessionId = '';
  state.history = [];
  state.testAgentId = '';
  state.testAgentRevision = null;
  resetRunInspector();
  try {
    localStorage.removeItem(STORAGE_KEYS.sessionId);
    localStorage.removeItem(STORAGE_KEYS.conversation);
  } catch (_) {}
  saveWorkbenchState();
  renderConversation();
  renderMetadata();
}

function updateAgentListItem(agent) {
  const index = state.agents.findIndex((item) => item.agent_id === agent.agent_id);
  if (index >= 0) state.agents.splice(index, 1, agent);
  else state.agents.unshift(agent);
}

async function openAgent(agentId, { skipDirtyCheck = false } = {}) {
  if (!state.runtimeClient || state.isRunning) return false;
  if (!skipDirtyCheck && agentFormIsDirty() && !window.confirm('Discard unsaved Agent changes?')) {
    renderAgentDefinition();
    return false;
  }
  try {
    const agent = await state.runtimeClient.getAgent(agentId);
    const bindingMatches = isAgentTestContextCurrent({ agentId: state.testAgentId, revision: state.testAgentRevision }, agent);
    state.selectedAgent = agent;
    state.selectedAgentId = agent.agent_id;
    state.agentMode = 'existing';
    state.conflictServerAgent = null;
    state.saveState = 'idle';
    setAgentFormFromResource(agent);
    updateAgentListItem(agent);
    if (!bindingMatches && (state.sessionId || state.activeRunId || state.history.length)) clearAgentTestContext();
    saveWorkbenchState();
    renderRegistry();
    await Promise.all([loadSelectedToolProfile(), loadSelectedOutputSchema()]);
    return true;
  } catch (error) {
    showAlert('Agent unavailable', describeRuntimeError(error), 'error');
    renderAgentDefinition();
    return false;
  }
}

function startNewAgent({ skipDirtyCheck = false } = {}) {
  if (state.isRunning) return false;
  if (!skipDirtyCheck && agentFormIsDirty() && !window.confirm('Discard unsaved Agent changes?')) {
    renderAgentDefinition();
    return false;
  }
  if (state.sessionId || state.activeRunId || state.history.length) clearAgentTestContext();
  state.selectedAgent = null;
  state.selectedAgentId = '';
  state.agentMode = 'new';
  state.conflictServerAgent = null;
  state.saveState = 'idle';
  state.agentForm = { name: '', model: '', reasoningEffort: '', instructions: '', toolProfileId: '', outputSchemaId: '' };
  state.outputSchemaDetail = null;
  state.toolProfileDetail = null;
  state.modelSelectionNotice = '';
  seedNewAgentDefaults();
  saveWorkbenchState();
  renderRegistry();
  elements.agentNameInput.focus();
  return true;
}

async function loadAgents({ initial = false } = {}) {
  if (!state.runtimeClient || !state.currentUser || state.agentsState === 'loading') return;
  state.agentsState = 'loading';
  state.agentsError = '';
  renderAgentDefinition();
  try {
    const result = await state.runtimeClient.listAgents();
    state.agents = [...result.items];
    state.agentsState = 'ready';
    if (!initial) {
      const current = state.selectedAgent && state.agents.find((agent) => agent.agent_id === state.selectedAgent.agent_id);
      if (current && current.revision !== state.selectedAgent.revision) {
        if (agentFormIsDirty()) {
          state.conflictServerAgent = current;
          state.saveState = 'conflict';
        } else await openAgent(current.agent_id, { skipDirtyCheck: true });
      }
      renderRegistry();
      return;
    }
    const remembered = state.agents.find((agent) => agent.agent_id === state.selectedAgentId);
    if (remembered) {
      const opened = await openAgent(remembered.agent_id, { skipDirtyCheck: true });
      if (!opened && (state.sessionId || state.activeRunId || state.history.length)) clearAgentTestContext();
    }
    else if (!state.agents.length) startNewAgent({ skipDirtyCheck: true });
    else {
      state.selectedAgent = null;
      state.selectedAgentId = '';
      state.agentMode = 'none';
      if (state.sessionId || state.activeRunId || state.history.length) clearAgentTestContext();
      saveWorkbenchState();
    }
  } catch (error) {
    state.agentsState = 'error';
    state.agentsError = describeRuntimeError(error);
    showAlert('Agent discovery failed', state.agentsError, 'error');
  }
  renderRegistry();
}

async function refreshDiscovery() {
  await Promise.all([loadRegistry(), loadAgents()]);
}

async function saveAgentDefinition() {
  if (!state.runtimeClient || !state.currentUser || state.isRunning || state.saveState === 'saving' || state.saveState === 'conflict') return;
  if (!state.agentForm.name.trim()) {
    showAlert('Name required', 'Enter a name before saving this Draft Agent.', 'error');
    elements.agentNameInput.focus();
    return;
  }
  const validation = currentAgentRegistryValidation();
  if (!validation.valid) {
    showAlert('Configuration unavailable', registryValidationMessage(validation.errors), 'error');
    return;
  }
  state.saveState = 'saving';
  renderAgentDefinition();
  try {
    const previousRevision = state.selectedAgent?.revision || null;
    const saved = state.agentMode === 'new'
      ? await state.runtimeClient.createAgent(state.agentForm)
      : await state.runtimeClient.patchAgent(state.selectedAgent.agent_id, createAgentDefinitionPatchRequest(state.selectedAgent, state.agentForm));
    state.selectedAgent = saved;
    state.selectedAgentId = saved.agent_id;
    state.agentMode = 'existing';
    state.conflictServerAgent = null;
    state.saveState = 'idle';
    setAgentFormFromResource(saved);
    updateAgentListItem(saved);
    if (previousRevision !== null && saved.revision !== previousRevision) {
      clearAgentTestContext();
      showAlert('Draft saved', `Draft saved as revision ${saved.revision}. Configuration changed, so the next test will start a new session.`);
    } else {
      showAlert('Draft saved', `Draft saved as revision ${saved.revision}.`);
    }
    saveWorkbenchState();
    renderRegistry();
  } catch (error) {
    if (error?.code === 'AGENT_DEFINITION_CONFLICT' && state.selectedAgent) {
      state.saveState = 'conflict';
      try { state.conflictServerAgent = await state.runtimeClient.getAgent(state.selectedAgent.agent_id); } catch (_) { state.conflictServerAgent = null; }
      showAlert('Draft changed on the server', 'Your edits are preserved. Reload the latest revision before saving again.', 'error');
    } else {
      state.saveState = 'idle';
      showAlert('Draft save failed', describeRuntimeError(error), 'error');
    }
    renderAgentDefinition();
  }
}

async function reloadLatestAgent() {
  if (!state.selectedAgent || state.isRunning) return;
  if (agentFormIsDirty() && !window.confirm('Discard local edits and load the latest server revision?')) return;
  const latest = await state.runtimeClient.getAgent(state.selectedAgent.agent_id);
  const bindingMatches = isAgentTestContextCurrent({ agentId: state.testAgentId, revision: state.testAgentRevision }, latest);
  state.selectedAgent = latest;
  state.selectedAgentId = latest.agent_id;
  state.conflictServerAgent = null;
  state.saveState = 'idle';
  setAgentFormFromResource(latest);
  updateAgentListItem(latest);
  if (!bindingMatches && (state.sessionId || state.activeRunId || state.history.length)) clearAgentTestContext();
  saveWorkbenchState();
  hideAlert();
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
  elements.resultSchemaId.textContent = state.result?.schemaId || state.selectedAgent?.output_schema_id || 'Not requested';
  const normalized = normalizedResultOutput();
  const validation = normalized.malformed ? 'Malformed output' : state.result?.validationStatus || (state.selectedAgent?.output_schema_id ? state.validationStatus : 'Not requested');
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
  state.validationStatus = state.selectedAgent?.output_schema_id ? 'pending' : 'not_requested';
  state.reconnectAttempt = 0;
  renderActivity();
  renderResult();
  renderMetadata();
}

async function runAgentTest(input) {
  if (!state.selectedAgent || agentFormIsDirty() || !currentAgentRegistryValidation().valid) return;
  state.isRunning = true;
  state.runStatus = 'submitting';
  state.validationStatus = state.selectedAgent.output_schema_id ? 'pending' : 'not_requested';
  setRuntimeStatus('running', 'Checking saved revision');
  renderControls();
  try {
    const latest = await state.runtimeClient.getAgent(state.selectedAgent.agent_id);
    if (latest.revision !== state.selectedAgent.revision) {
      state.conflictServerAgent = latest;
      state.saveState = 'conflict';
      state.isRunning = false;
      state.runStatus = 'idle';
      showAlert('Agent revision changed', `The server is at revision ${latest.revision}. Reload the latest Draft before testing.`, 'error');
      renderAgentDefinition();
      return;
    }
    const contextMatches = isAgentTestContextCurrent({ agentId: state.testAgentId, revision: state.testAgentRevision }, state.selectedAgent);
    if (!contextMatches && (state.sessionId || state.activeRunId || state.history.length)) clearAgentTestContext();
    resetRunInspector();
    state.isRunning = true;
    state.runStatus = 'submitting';
    const created = await state.runtimeClient.createAgentTestRun(state.selectedAgent.agent_id, input, contextMatches ? state.sessionId : '');
    state.activeRunId = created.run_id;
    state.runStatus = created.status;
    state.testAgentId = state.selectedAgent.agent_id;
    state.testAgentRevision = state.selectedAgent.revision;
    state.streamEpoch += 1;
    addMessage({ role: 'user', content: input });
    elements.promptInput.value = '';
    saveWorkbenchState();
    renderMetadata();
    setRuntimeStatus('running', 'Agent test active');
    monitorObservableRun(created.run_id, state.streamEpoch);
  } catch (error) {
    const message = describeRuntimeError(error);
    state.isRunning = false;
    state.runStatus = 'failed';
    if (error?.code === 'AGENT_SESSION_DEFINITION_MISMATCH') {
      clearAgentTestContext();
      showAlert('New test session required', message, 'error');
    } else if (error?.code === 'AGENT_DEFINITION_CONFLICT') {
      state.saveState = 'conflict';
      try { state.conflictServerAgent = await state.runtimeClient.getAgent(state.selectedAgent.agent_id); } catch (_) {}
      showAlert('Agent revision changed', 'Reload the latest Draft before testing.', 'error');
    } else {
      showAlert('Test submission failed', message, 'error');
    }
    setRuntimeStatus('error', 'Submission failed');
    renderAgentDefinition();
    renderControls();
    saveWorkbenchState();
  }
}

async function executeMission(input) {
  if (state.isRunning || !state.currentUser || !state.runtimeClient) return;
  hideAlert();
  await runAgentTest(input);
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
  state.testAgentId = '';
  state.testAgentRevision = null;
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
        await Promise.all([loadRegistry(), loadAgents({ initial: true })]);
        if (state.activeRunId && isAgentTestContextCurrent(
          { agentId: state.testAgentId, revision: state.testAgentRevision }, state.selectedAgent
        )) await resumePersistedRun();
      } else {
        state.streamEpoch += 1;
        state.streamController?.abort();
        state.isRunning = false;
        state.modelRegistryState = 'idle';
        state.outputSchemaRegistryState = 'idle';
        state.toolProfileRegistryState = 'idle';
        state.modelRegistryError = '';
        state.modelCatalog = null;
        state.modelSelectionNotice = '';
        state.agentsState = 'idle';
        state.agentsError = '';
        state.agents = [];
        state.selectedAgent = null;
        state.agentMode = 'none';
        state.conflictServerAgent = null;
        state.agentForm = { name: '', model: '', reasoningEffort: '', instructions: '', toolProfileId: '', outputSchemaId: '' };
        renderRegistry();
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
elements.newSessionButton.addEventListener('click', resetSession);
elements.authButton.addEventListener('click', handleAuthAction);
elements.refreshRegistryButton.addEventListener('click', refreshDiscovery);
elements.agentSelect.addEventListener('change', () => {
  const agentId = elements.agentSelect.value;
  if (!agentId) {
    renderAgentDefinition();
    return;
  }
  openAgent(agentId);
});
elements.newAgentButton.addEventListener('click', () => startNewAgent());
elements.saveAgentButton.addEventListener('click', saveAgentDefinition);
elements.agentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!elements.saveAgentButton.disabled) saveAgentDefinition();
});
elements.reloadAgentButton.addEventListener('click', () => {
  reloadLatestAgent().catch((error) => showAlert('Agent reload failed', describeRuntimeError(error), 'error'));
});
elements.agentNameInput.addEventListener('input', () => {
  state.agentForm.name = elements.agentNameInput.value;
  renderAgentDefinition();
});
elements.agentInstructionsInput.addEventListener('input', () => {
  state.agentForm.instructions = elements.agentInstructionsInput.value;
  renderAgentDefinition();
});
elements.modelSelect.addEventListener('change', () => {
  const modelId = elements.modelSelect.value;
  if (!state.modelCatalog?.items?.some((item) => item.id === modelId)) return;
  const model = state.modelCatalog.items.find((item) => item.id === modelId);
  state.agentForm.model = modelId;
  if (!model.supported_reasoning_efforts.some((effort) => effort.id === state.agentForm.reasoningEffort)) {
    state.agentForm.reasoningEffort = '';
    state.modelSelectionNotice = 'Choose a reasoning effort advertised for the selected model.';
  } else state.modelSelectionNotice = '';
  renderRegistry();
});
elements.reasoningEffortSelect.addEventListener('change', () => {
  const effortId = elements.reasoningEffortSelect.value;
  const selectedModel = state.modelCatalog?.items?.find((item) => item.id === state.agentForm.model);
  if (!selectedModel?.supported_reasoning_efforts.some((effort) => effort.id === effortId)) return;
  state.agentForm.reasoningEffort = effortId;
  state.modelSelectionNotice = '';
  state.modelSelectionNoticeTone = 'warning';
  renderRegistry();
});
elements.toolProfileSelect.addEventListener('change', () => {
  state.agentForm.toolProfileId = elements.toolProfileSelect.value;
  state.contractTab = 'tool';
  saveWorkbenchState();
  renderRegistry();
  loadSelectedToolProfile();
});
elements.outputSchemaSelect.addEventListener('change', () => {
  state.agentForm.outputSchemaId = elements.outputSchemaSelect.value;
  state.validationStatus = state.agentForm.outputSchemaId ? 'pending' : 'not_requested';
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
window.addEventListener('beforeunload', (event) => {
  if (!agentFormIsDirty()) return;
  event.preventDefault();
  event.returnValue = '';
});

renderConversation();
renderMetadata();
renderAuth();
renderRegistry();
renderActivity();
renderResult();
renderDraft();
initializeAuth();
