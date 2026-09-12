import { getFirebaseBrowserAuthClient, getFirebaseAuthErrorCode, signInWithGoogle } from '../firebase-auth-client.mjs';
import { AgentRuntimeError, createAgentRuntimeClient } from './runtime-client.mjs';

const STORAGE_KEYS = Object.freeze({
  sessionId: 'lge.agentPlayground.sessionId.v1',
  conversation: 'lge.agentPlayground.conversation.v1'
});
const MAX_HISTORY_MESSAGES = 80;
const MAX_STORED_CONTENT_LENGTH = 50_000;

const elements = {
  headerStatusDot: document.getElementById('headerStatusDot'),
  headerStatusText: document.getElementById('headerStatusText'),
  panelStatus: document.getElementById('panelStatus'),
  conversation: document.getElementById('conversation'),
  emptyState: document.getElementById('emptyState'),
  conversationTurnCount: document.getElementById('conversationTurnCount'),
  conversationTurnLabel: document.getElementById('conversationTurnLabel'),
  promptForm: document.getElementById('promptForm'),
  promptInput: document.getElementById('promptInput'),
  runButton: document.getElementById('runButton'),
  newSessionButton: document.getElementById('newSessionButton'),
  sessionId: document.getElementById('sessionId'),
  turnCount: document.getElementById('turnCount'),
  lastLatency: document.getElementById('lastLatency'),
  statusAlert: document.getElementById('statusAlert'),
  statusAlertTitle: document.getElementById('statusAlertTitle'),
  statusAlertMessage: document.getElementById('statusAlertMessage'),
  authAvatar: document.getElementById('authAvatar'),
  authIdentity: document.getElementById('authIdentity'),
  authButton: document.getElementById('authButton')
};

const state = {
  sessionId: loadSessionId(),
  history: loadHistory(),
  firebaseClient: null,
  currentUser: null,
  runtimeClient: null,
  authState: 'initializing',
  runtimeState: 'initializing',
  isRunning: false
};

function loadSessionId() {
  try { return String(localStorage.getItem(STORAGE_KEYS.sessionId) || '').trim(); } catch (_) { return ''; }
}

function normalizeStoredMessage(value) {
  if (!value || typeof value !== 'object') return null;
  const role = ['user', 'agent', 'notice'].includes(value.role) ? value.role : '';
  const content = typeof value.content === 'string' ? value.content.slice(0, MAX_STORED_CONTENT_LENGTH) : '';
  if (!role || !content) return null;
  return {
    role,
    content,
    timestamp: Number.isFinite(Number(value.timestamp)) ? Number(value.timestamp) : Date.now(),
    turnId: typeof value.turnId === 'string' ? value.turnId.slice(0, 500) : '',
    durationMs: Number.isFinite(Number(value.durationMs)) ? Math.max(0, Number(value.durationMs)) : null
  };
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.conversation) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredMessage).filter(Boolean).slice(-MAX_HISTORY_MESSAGES);
  } catch (_) {
    return [];
  }
}

function saveState() {
  try {
    if (state.sessionId) localStorage.setItem(STORAGE_KEYS.sessionId, state.sessionId);
    else localStorage.removeItem(STORAGE_KEYS.sessionId);
    localStorage.setItem(STORAGE_KEYS.conversation, JSON.stringify(state.history.slice(-MAX_HISTORY_MESSAGES)));
  } catch (_) {
    showAlert('Storage unavailable', 'This browser could not persist the current runtime session.', 'error');
  }
}

function completedTurnCount() {
  return state.history.filter((message) => message.role === 'agent').length;
}

function latestLatency() {
  return [...state.history].reverse().find((message) => message.role === 'agent' && Number.isFinite(message.durationMs))?.durationMs ?? null;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

function formatLatency(durationMs) {
  if (!Number.isFinite(durationMs)) return '—';
  return durationMs >= 1000 ? `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 1 : 2)} s` : `${Math.round(durationMs)} ms`;
}

function setRuntimeStatus(kind, label) {
  state.runtimeState = kind;
  elements.headerStatusDot.className = 'apg-status-dot';
  if (kind === 'ready' || kind === 'completed') elements.headerStatusDot.classList.add('is-ready');
  else if (kind === 'running') elements.headerStatusDot.classList.add('is-running');
  else if (kind === 'error') elements.headerStatusDot.classList.add('is-error');
  else if (kind === 'auth-required') elements.headerStatusDot.classList.add('is-warning');
  elements.headerStatusText.textContent = label;
  elements.panelStatus.textContent = label;
  elements.panelStatus.title = label;
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

  if (message.role === 'agent' && (message.turnId || Number.isFinite(message.durationMs))) {
    const meta = document.createElement('div');
    meta.className = 'apg-message__meta';
    if (message.turnId) {
      const turn = document.createElement('span');
      turn.textContent = `turn ${message.turnId}`;
      meta.append(turn);
    }
    if (Number.isFinite(message.durationMs)) {
      const latency = document.createElement('span');
      latency.textContent = `latency ${formatLatency(message.durationMs)}`;
      meta.append(latency);
    }
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

function renderMetadata() {
  const turnCount = completedTurnCount();
  elements.sessionId.textContent = state.sessionId || 'Not established';
  elements.sessionId.title = state.sessionId || 'No active session';
  elements.turnCount.textContent = String(turnCount);
  elements.conversationTurnCount.textContent = String(turnCount);
  elements.conversationTurnLabel.textContent = turnCount === 1 ? 'turn' : 'turns';
  elements.lastLatency.textContent = formatLatency(latestLatency());
}

function renderControls() {
  const isAuthenticated = state.authState === 'authenticated';
  const hasPrompt = Boolean(elements.promptInput.value.trim());
  elements.runButton.disabled = !isAuthenticated || !hasPrompt || state.isRunning;
  elements.runButton.classList.toggle('is-busy', state.isRunning);
  elements.promptInput.disabled = state.isRunning;
  elements.newSessionButton.disabled = state.isRunning || (!state.sessionId && state.history.length === 0);
  elements.authButton.disabled = state.authState === 'initializing' || state.authState === 'authenticating' || state.authState === 'unavailable' || state.isRunning;
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
    elements.authIdentity.title = '';
    elements.authAvatar.textContent = '…';
    elements.authButton.textContent = 'Sign in';
  } else if (state.authState === 'unavailable') {
    elements.authIdentity.textContent = 'Firebase unavailable';
    elements.authIdentity.title = 'Firebase unavailable';
    elements.authAvatar.textContent = '!';
    elements.authButton.textContent = 'Sign in';
  } else if (state.authState === 'signed-out') {
    elements.authIdentity.textContent = 'Authentication required';
    elements.authIdentity.title = 'Authentication required';
    elements.authAvatar.textContent = '?';
    elements.authButton.textContent = 'Sign in';
  } else {
    elements.authIdentity.textContent = 'Checking session…';
    elements.authIdentity.title = '';
    elements.authAvatar.textContent = '…';
    elements.authButton.textContent = 'Sign in';
  }
  renderControls();
}

function addMessage(message) {
  const normalized = normalizeStoredMessage({ ...message, timestamp: message.timestamp || Date.now() });
  if (!normalized) return;
  state.history.push(normalized);
  state.history = state.history.slice(-MAX_HISTORY_MESSAGES);
  saveState();
  renderConversation({ scroll: true });
  renderMetadata();
}

function describeRuntimeError(error) {
  if (error instanceof AgentRuntimeError) return error.message;
  if (getFirebaseAuthErrorCode(error).startsWith('auth/')) return 'Firebase could not refresh the authenticated session. Sign in again and retry.';
  return 'The agent runtime failed unexpectedly. Try this turn again.';
}

async function runAgent(input) {
  if (state.isRunning) return;
  if (!state.currentUser || !state.runtimeClient) {
    showAlert('Authentication required', 'Sign in with Google to obtain a Firebase ID token before running the agent.');
    setRuntimeStatus('auth-required', 'Sign-in required');
    return;
  }

  hideAlert();
  state.isRunning = true;
  addMessage({ role: 'user', content: input });
  elements.promptInput.value = '';
  setRuntimeStatus('running', 'Running');
  renderControls();

  try {
    const result = await state.runtimeClient.run({ input, sessionId: state.sessionId });
    state.sessionId = result.session_id;
    addMessage({
      role: 'agent',
      content: result.output,
      turnId: result.turn_id,
      durationMs: result.duration_ms
    });
    saveState();
    setRuntimeStatus('completed', 'Completed');
  } catch (error) {
    const message = describeRuntimeError(error);
    addMessage({ role: 'notice', content: message });
    showAlert('Execution failed', message, 'error');
    setRuntimeStatus('error', error?.code === 'timeout' ? 'Timed out' : 'Runtime error');
  } finally {
    state.isRunning = false;
    renderMetadata();
    renderControls();
    elements.promptInput.focus();
  }
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
  try {
    await signInWithGoogle(state.firebaseClient);
  } catch (_) {
    state.authState = 'signed-out';
    renderAuth();
    showAlert('Sign-in incomplete', 'Google sign-in did not complete. Please try again.', 'error');
    setRuntimeStatus('auth-required', 'Sign-in required');
  }
}

function resetSession() {
  state.sessionId = '';
  state.history = [];
  try {
    localStorage.removeItem(STORAGE_KEYS.sessionId);
    localStorage.removeItem(STORAGE_KEYS.conversation);
  } catch (_) {}
  hideAlert();
  renderConversation();
  renderMetadata();
  if (state.authState === 'unavailable') {
    showAlert('Firebase unavailable', 'Authentication could not be initialized. Open this page from the deployed Firebase Hosting origin and reload.', 'error');
    setRuntimeStatus('error', 'Auth unavailable');
  } else if (state.currentUser) {
    setRuntimeStatus('ready', 'Ready');
  } else {
    showAlert('Authentication required', 'Sign in with Google to authorize requests with a Firebase ID token.');
    setRuntimeStatus('auth-required', 'Sign-in required');
  }
  renderControls();
  elements.promptInput.focus();
}

async function initializeAuth() {
  try {
    state.firebaseClient = await getFirebaseBrowserAuthClient();
    state.runtimeClient = createAgentRuntimeClient({
      getIdToken: async (forceRefresh = false) => {
        if (!state.currentUser) throw new AgentRuntimeError('auth_missing', 'Sign in with Firebase before running the agent.', 401);
        return state.currentUser.getIdToken(forceRefresh === true);
      }
    });
    state.firebaseClient.authMod.onAuthStateChanged(state.firebaseClient.auth, (user) => {
      state.currentUser = user || null;
      state.authState = user ? 'authenticated' : 'signed-out';
      renderAuth();
      if (user) {
        hideAlert();
        setRuntimeStatus('ready', state.sessionId ? 'Session ready' : 'Ready');
      } else {
        showAlert('Authentication required', 'Sign in with Google to authorize requests with a Firebase ID token.');
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

elements.promptForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = elements.promptInput.value.trim();
  if (input) runAgent(input);
});

elements.promptInput.addEventListener('input', renderControls);
elements.promptInput.addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (!elements.runButton.disabled) elements.promptForm.requestSubmit();
  }
});
elements.newSessionButton.addEventListener('click', resetSession);
elements.authButton.addEventListener('click', handleAuthAction);

renderConversation();
renderMetadata();
renderAuth();
initializeAuth();
