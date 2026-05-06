// ======================================================
// Meeting AI Voice Session App
// Integrated mobile UI + OpenAI Realtime WebRTC Core
//
// 역할:
// - Salesforce URL에서 sessionToken 수신
// - n8n start-realtime webhook 호출
// - n8n이 조립한 OpenAI Realtime session/client_secret으로 WebRTC 연결
// - 사용자가 종료하거나 브라우저/모바일 이탈/연결 끊김이 발생하면
//   n8n end-realtime 종료 시그널 전송
// - 통화 결과/요약/로그는 모바일에 표시하지 않음
// ======================================================

const CONFIG = {
    START_REALTIME_WEBHOOK: "https://peter-n8n.duckdns.org/webhook/meeting-ai/start-realtime",
    END_REALTIME_WEBHOOK: "https://peter-n8n.duckdns.org/webhook/meeting-ai/end-realtime",

    // OpenAI Realtime WebRTC SDP exchange endpoint
    OPENAI_REALTIME_SDP_URL: "https://api.openai.com/v1/realtime/calls",

    // n8n response의 realtime.model이 우선 사용됨.
    // 이 값은 fallback 용도.
    DEFAULT_REALTIME_MODEL: "gpt-realtime-mini",

    START_TIMEOUT_MS: 45000,
    END_TIMEOUT_MS: 10000,

    // WebRTC disconnected는 일시적 네트워크 흔들림일 수 있으므로
    // 즉시 종료하지 않고 짧은 grace window를 둔다.
    DISCONNECT_GRACE_MS: 8000,

    // DataChannel close는 provider/session 종료 신호일 수 있으므로
    // 짧게 확인한 뒤 종료 처리한다.
    DATA_CHANNEL_CLOSE_GRACE_MS: 1500
};

const APP_VERSION = "meeting-ai-voice-session.mobile.v2.6-end-reason-classifier";
console.log(APP_VERSION);

// ------------------------------------------------------
// DOM Elements
// ------------------------------------------------------

const statusDot = document.getElementById("statusDot");
const tokenValue = document.getElementById("tokenValue");
const btnStart = document.getElementById("btnStart");
const btnEnd = document.getElementById("btnEnd");
const micInner = document.getElementById("micInner");
const waveform = document.getElementById("waveform");
const timerEl = document.getElementById("timer");

const remoteAudio = document.createElement("audio");
remoteAudio.autoplay = true;
remoteAudio.playsInline = true;
remoteAudio.style.display = "none";
document.body.appendChild(remoteAudio);

// ------------------------------------------------------
// URL params
// ------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const sessionToken = params.get("sessionToken") || params.get("token") || "";
const debugMode = params.get("debug") === "1";

// ------------------------------------------------------
// Runtime state
// ------------------------------------------------------

let callState = "idle";
let activeSessionSeq = 0;
let endSubmitted = false;

let pc = null;
let dataChannel = null;
let localStream = null;

let startedAt = null;
let currentStartResponse = null;
let currentVoiceSessionId = null;
let currentRealtimeSessionId = null;
let currentOpenAICallId = null;
let currentClientCallId = null;

let timerInterval = null;
let seconds = 0;

let disconnectGraceTimer = null;
let dataChannelCloseTimer = null;

let lastUserAction = null;
let lastUserActionAt = null;
let lifecycleEvents = [];
let rtcStateEvents = [];

// ------------------------------------------------------
// Session Token UI Branch
// ------------------------------------------------------
// 토큰 형식: {prefix}-{subjectHint(최대10자, 공백→_)}-{EventId}
// prefix: "pre" | "post" | 그 외(default/test)

const SESSION_TYPE_CONFIG = {
    pre: {
        badge: "SMART COACH",
        title: "Smart Coach",
        subtitle: "🤖🔎 Agent가 조사한 정보를 기반으로\n미팅 준비를 도와 드릴게요!",
        chipLabel: "SUBJECT"
    },
    post: {
        badge: "MEETING SUPPORT",
        title: "Meeting Support",
        subtitle: "🤖✍️ Agent와 오늘의 미팅을 요약하고,\n후속 아이템을 정리해 드릴게요!",
        chipLabel: "SUBJECT"
    },
    default: {
        badge: "MEETING AI",
        title: "Voice Session",
        subtitle: "Salesforce 알림에서 전달된 세션으로 음성 브리핑을 시작합니다.",
        chipLabel: "SESSION TOKEN"
    }
};

const SUBJECT_DISPLAY_MAX = 12; // 칩에서 truncate할 최대 글자 수

function parseSessionToken(token) {
    if (!token) return { type: "default", subjectHint: null };

    const lower = token.toLowerCase();
    let type = "default";

    if (lower.startsWith("pre-")) type = "pre";
    if (lower.startsWith("post-")) type = "post";

    if (type === "default") return { type, subjectHint: null };

    // 형식: "pre-GS건설_차세대-00U..." → prefix 이후 첫 "-" 까지가 subjectHint
    const prefixLen = type === "pre" ? 4 : 5; // "pre-"=4, "post-"=5
    const withoutPrefix = token.slice(prefixLen); // "GS건설_차세대-00U..."
    const dashIdx = withoutPrefix.indexOf("-");
    const rawHint = dashIdx !== -1 ? withoutPrefix.slice(0, dashIdx) : withoutPrefix;
    const subjectHint = rawHint.replace(/_/g, " "); // "_" → 공백 복원

    return { type, subjectHint: subjectHint || null };
}

function applySessionTypeUI() {
    const { type, subjectHint } = parseSessionToken(sessionToken);
    const cfg = SESSION_TYPE_CONFIG[type];

    const badgeEl = document.querySelector(".badge");
    const titleEl = document.querySelector(".page-title");
    const subtitleEl = document.querySelector(".page-subtitle");
    const chipLabelEl = document.querySelector(".info-chip--subject .info-chip-label");

    // badge는 제거되었지만, 혹시 남아 있어도 null-safe
    if (badgeEl) badgeEl.textContent = cfg.badge;
    if (titleEl) titleEl.textContent = cfg.title;
    if (subtitleEl) subtitleEl.textContent = cfg.subtitle;
    if (chipLabelEl) chipLabelEl.textContent = cfg.chipLabel;

    // subject hint가 있으면 칩 값에 표시 (최대 12자 truncate)
    if (subjectHint && tokenValue) {
        const display = subjectHint.length > SUBJECT_DISPLAY_MAX
            ? subjectHint.slice(0, SUBJECT_DISPLAY_MAX) + "\u2026"
            : subjectHint;
        tokenValue.textContent = display;
    }
    // subjectHint 없는 default 케이스는 initialize()의 maskToken 로직이 처리
}

// ------------------------------------------------------
// UI Helpers
// ------------------------------------------------------

function padZ(n) {
    return String(n).padStart(2, "0");
}

function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;

    if (timerEl) {
        timerEl.textContent = "00:00";
        timerEl.classList.add("visible");
    }

    timerInterval = setInterval(() => {
        seconds += 1;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (timerEl) timerEl.textContent = `${padZ(m)}:${padZ(s)}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    seconds = 0;

    if (timerEl) {
        timerEl.classList.remove("visible");
        timerEl.textContent = "00:00";
    }
}

function setButtons({ startDisabled, endDisabled }) {
    if (btnStart) btnStart.disabled = Boolean(startDisabled);
    if (btnEnd) btnEnd.disabled = Boolean(endDisabled);
}

function setStatus(message, stateClass = "ready") {
    if (!statusDot) return;

    const textEl = statusDot.querySelector(".status-text");
    if (textEl) {
        textEl.textContent = message;
    } else {
        statusDot.textContent = message;
    }

    statusDot.className = `info-chip-value status-dot ${stateClass}`;
}

function setVisualizerActive(isActive) {
    if (micInner) micInner.classList.toggle("active", Boolean(isActive));
    if (waveform) waveform.classList.toggle("active", Boolean(isActive));
}

function setCallState(nextState, message) {
    callState = nextState;

    document.documentElement.classList.toggle("call-live", nextState === "in_call");

    const defaultMessage = {
        idle: "Ready",
        validating: "세션 확인 중",
        microphone: "마이크 확인 중",
        connecting: "통화 연결 중",
        in_call: "통화 중",
        ending: "통화 종료 중",
        ended: "통화 종료됨",
        blocked: "시작 불가",
        error: "오류 발생"
    }[nextState] || nextState;

    let stateClass = "ready";

    if (nextState === "in_call") {
        stateClass = "active";
    } else if (["connecting", "validating", "microphone", "ending"].includes(nextState)) {
        stateClass = "pending";
    } else if (["error", "blocked"].includes(nextState)) {
        stateClass = "error";
    }

    setStatus(message || defaultMessage, stateClass);

    if (nextState === "in_call") {
        setVisualizerActive(true);
        if (!timerInterval) startTimer();
        return;
    }

    if (["ended", "error", "blocked", "idle"].includes(nextState)) {
        setVisualizerActive(false);
        stopTimer();
    }
}

// ------------------------------------------------------
// General Utility
// ------------------------------------------------------

function nowIso() {
    return new Date().toISOString();
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch (_) { return null; }
}

function maskToken(token) {
    if (!token) return "Missing Token";
    if (token.length <= 16) return token;
    return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

function safeErrorMessage(error) {
    return String(error?.message || error || "Unknown error").slice(0, 500);
}

function createClientCallId() {
    try {
        if (crypto?.randomUUID) return crypto.randomUUID();
    } catch (_) { }

    return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pushLimited(list, item, max = 20) {
    list.push(item);
    while (list.length > max) list.shift();
}

function recordUserAction(action) {
    lastUserAction = action;
    lastUserActionAt = nowIso();

    if (debugMode) {
        console.log("[Meeting AI] user action:", {
            action,
            at: lastUserActionAt
        });
    }
}

function recordLifecycleEvent(type, extra = {}) {
    const event = {
        type,
        at: nowIso(),
        visibilityState: document.visibilityState || null,
        documentHidden: Boolean(document.hidden),
        online: typeof navigator.onLine === "boolean" ? navigator.onLine : null,
        callState,
        ...extra
    };

    pushLimited(lifecycleEvents, event, 20);

    if (debugMode) console.log("[Meeting AI] lifecycle:", event);

    return event;
}

function recordRtcState(type, extra = {}) {
    const event = {
        type,
        at: nowIso(),
        callState,
        connectionState: pc ? pc.connectionState : null,
        iceConnectionState: pc ? pc.iceConnectionState : null,
        signalingState: pc ? pc.signalingState : null,
        dataChannelState: dataChannel ? dataChannel.readyState : null,
        ...extra
    };

    pushLimited(rtcStateEvents, event, 30);

    if (debugMode) console.log("[Meeting AI] rtc state:", event);

    return event;
}

function getLastUserActionAgeMs() {
    if (!lastUserActionAt) return null;
    return Math.max(0, Date.now() - new Date(lastUserActionAt).getTime());
}

function getDurationSecUntil(endedAt) {
    if (!startedAt) return 0;

    return Math.max(0, Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    ));
}

function getLocalAudioTrackDiagnostics() {
    try {
        const tracks = localStream ? localStream.getAudioTracks() : [];
        return tracks.map((track) => ({
            id: track.id || null,
            kind: track.kind || null,
            labelPresent: Boolean(track.label),
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
        }));
    } catch (_) {
        return [];
    }
}

function isActiveVoiceState() {
    return ["microphone", "connecting", "in_call"].includes(callState);
}

function clearDisconnectGraceTimer() {
    if (disconnectGraceTimer) {
        clearTimeout(disconnectGraceTimer);
        disconnectGraceTimer = null;
    }
}

function clearDataChannelCloseTimer() {
    if (dataChannelCloseTimer) {
        clearTimeout(dataChannelCloseTimer);
        dataChannelCloseTimer = null;
    }
}

function clearExitTimers() {
    clearDisconnectGraceTimer();
    clearDataChannelCloseTimer();
}

function resetRuntimeSessionMetadata() {
    currentStartResponse = null;
    currentVoiceSessionId = null;
    currentRealtimeSessionId = null;
    currentOpenAICallId = null;
    currentClientCallId = null;
    startedAt = null;
}

function buildExitEvidence({ trigger = null, extra = {} } = {}) {
    return {
        trigger,
        clientTimestamp: nowIso(),

        visibilityState: document.visibilityState || null,
        documentHidden: Boolean(document.hidden),
        online: typeof navigator.onLine === "boolean" ? navigator.onLine : null,

        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        appVersion: APP_VERSION,
        debugMode,

        callState,
        clientCallId: currentClientCallId,

        connectionState: pc ? pc.connectionState : null,
        iceConnectionState: pc ? pc.iceConnectionState : null,
        signalingState: pc ? pc.signalingState : null,
        dataChannelState: dataChannel ? dataChannel.readyState : null,

        hasLocalStream: Boolean(localStream),
        hasRemoteAudio: Boolean(remoteAudio?.srcObject),
        localAudioTracks: getLocalAudioTrackDiagnostics(),

        lastUserAction,
        lastUserActionAt,
        lastUserActionAgeMs: getLastUserActionAgeMs(),

        recentLifecycleEvents: lifecycleEvents.slice(-8),
        recentRtcStateEvents: rtcStateEvents.slice(-10),

        ...extra
    };
}

function extractClientSecret(data) {
    return (
        data?.realtime?.client_secret?.value ||
        data?.realtime?.clientSecret?.value ||
        data?.client_secret?.value ||
        data?.clientSecret?.value ||
        data?.clientSecret ||
        data?.ephemeralKey ||
        data?.ephemeral_key ||
        ""
    );
}

function extractRealtimeModel(data) {
    return (
        data?.realtime?.model ||
        data?.model ||
        CONFIG.DEFAULT_REALTIME_MODEL
    );
}

function extractRealtimeSessionId(data) {
    return (
        data?.realtime?.id ||
        data?.realtime?.sessionId ||
        data?.realtimeSessionId ||
        null
    );
}

function extractVoiceSessionId(data) {
    return (
        data?.voiceSessionId ||
        data?.voice_session_id ||
        data?.sessionId ||
        null
    );
}

function extractFirstUtterance(data) {
    return (
        data?.ui?.firstUtterance ||
        data?.firstUtterance ||
        data?.agentInput?.briefing_package?.first_utterance ||
        ""
    );
}

function classifyStartError(error) {
    const message = safeErrorMessage(error).toLowerCase();

    if (message.includes("permission") || message.includes("notallowed") || message.includes("denied")) {
        return "microphone_permission_denied_or_lost";
    }

    if (message.includes("client_secret")) {
        return "missing_realtime_client_secret";
    }

    if (message.includes("sdp")) {
        return "sdp_exchange_failed";
    }

    if (message.includes("network") || message.includes("fetch") || message.includes("abort")) {
        return "start_network_or_timeout_error";
    }

    return "client_start_error";
}

// ------------------------------------------------------
// Network
// ------------------------------------------------------
// n8n webhook 호출은 CORS preflight 가능성을 낮추기 위해
// application/json 대신 text/plain;charset=UTF-8로 JSON string을 전송한다.
// n8n C01_Validate_Start_Request는 string body를 JSON.parse하도록 구성되어 있어야 한다.

async function postJson(url, payload, { timeoutMs = 30000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            signal: controller.signal,
            headers: {
                "Accept": "application/json",
                "Content-Type": "text/plain;charset=UTF-8"
            },
            body: JSON.stringify(payload)
        });

        const rawText = await res.text();
        let data = {};

        if (rawText) {
            data = safeJsonParse(rawText);
            if (!data) throw new Error(`JSON 응답 파싱 실패: ${rawText.slice(0, 160)}`);
        }

        if (!res.ok) {
            throw new Error(data?.message || data?.error || `서버 응답 오류 (${res.status})`);
        }

        return data;
    } finally {
        clearTimeout(timer);
    }
}

function buildStartPayload() {
    return {
        sessionToken,
        client: "firebase-mobile-web",
        provider: "openai_realtime",
        clientCallId: currentClientCallId,
        pageUrl: window.location.href,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        userAgent: navigator.userAgent,
        requestedAt: nowIso()
    };
}

function buildEndPayload({
    endedBy = "user_button",
    finalState = "ended",
    exitReason = "explicit_user_end",
    exitConfidence = "high",
    trigger = "manual",
    exitEvidence = {}
} = {}) {
    const endedAt = nowIso();
    const durationSec = getDurationSecUntil(endedAt);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;

    const evidence = buildExitEvidence({
        trigger,
        extra: exitEvidence
    });

    const diagnostics = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timezone,
        appVersion: APP_VERSION,
        callState,
        debugMode,

        clientCallId: currentClientCallId,
        endTrigger: trigger,
        exitReason,
        exitConfidence,

        connectionState: pc ? pc.connectionState : null,
        iceConnectionState: pc ? pc.iceConnectionState : null,
        signalingState: pc ? pc.signalingState : null,
        dataChannelState: dataChannel ? dataChannel.readyState : null,

        visibilityState: document.visibilityState || null,
        documentHidden: Boolean(document.hidden),
        online: typeof navigator.onLine === "boolean" ? navigator.onLine : null,

        hasLocalStream: Boolean(localStream),
        hasRemoteAudio: Boolean(remoteAudio?.srcObject),
        localAudioTracks: getLocalAudioTrackDiagnostics()
    };

    return {
        sessionToken,
        sessionId: currentStartResponse?.sessionId || null,
        sessionType: currentStartResponse?.sessionType || null,
        provider: "openai_realtime",

        voiceSessionId: currentVoiceSessionId,
        realtimeSessionId: currentRealtimeSessionId,
        openaiCallId:
            currentOpenAICallId ||
            currentStartResponse?.openaiCallId ||
            currentStartResponse?.realtime?.callId ||
            null,

        clientCallId: currentClientCallId,
        endIdempotencyKey: `${currentClientCallId || "no-client-call-id"}:end`,

        startedAt,
        endedAt,
        durationSec,
        endedBy,
        finalState,

        // v2.6 canonical end classification
        exitReason,
        exitConfidence,
        exitEvidence: evidence,

        // Existing canonical field for n8n C01
        client: diagnostics,

        // Backward-compatible alias.
        browser: {
            sameAsClient: true,
            ...diagnostics
        },

        submittedAt: nowIso()
    };
}

function notifyEndBestEffort(payload) {
    try {
        postJson(CONFIG.END_REALTIME_WEBHOOK, payload, {
            timeoutMs: CONFIG.END_TIMEOUT_MS
        }).catch((error) => {
            console.warn("[Meeting AI] best-effort end webhook failed:", error);
        });
    } catch (error) {
        console.warn("[Meeting AI] best-effort end signal failed:", error);
    }
}

function sendEndPayload(payload, { preferBeacon = false } = {}) {
    let beaconSent = false;

    if (preferBeacon && navigator.sendBeacon) {
        try {
            const blob = new Blob([JSON.stringify(payload)], {
                type: "text/plain;charset=UTF-8"
            });
            beaconSent = navigator.sendBeacon(CONFIG.END_REALTIME_WEBHOOK, blob);
        } catch (error) {
            console.warn("[Meeting AI] sendBeacon end signal failed:", error);
        }
    }

    if (!beaconSent) {
        notifyEndBestEffort(payload);
    }

    return {
        beaconSent,
        fallbackFetchStarted: !beaconSent
    };
}

async function submitEndOnce({
    endedBy = "user_button",
    finalState = "ended",
    exitReason = "explicit_user_end",
    exitConfidence = "high",
    trigger = "manual",
    exitEvidence = {}
} = {}, {
    preferBeacon = false,
    auto = false,
    updateUi = true,
    resetRuntime = true
} = {}) {
    if (!sessionToken) return false;
    if (endSubmitted) return false;

    const payload = buildEndPayload({
        endedBy,
        finalState,
        exitReason,
        exitConfidence,
        trigger,
        exitEvidence
    });

    endSubmitted = true;
    clearExitTimers();

    const sendResult = sendEndPayload(payload, { preferBeacon });

    if (debugMode) {
        console.log("[Meeting AI] end submitted:", {
            endedBy,
            finalState,
            exitReason,
            exitConfidence,
            trigger,
            sendResult,
            payload
        });
    }

    try {
        await cleanupRealtimeObjects();
    } catch (error) {
        console.warn("[Meeting AI] cleanup after end failed:", error);
    }

    document.documentElement.classList.remove("call-live");

    if (updateUi) {
        setCallState("ended", "통화 종료됨");
        setButtons({ startDisabled: false, endDisabled: true });
    }

    if (resetRuntime) {
        resetRuntimeSessionMetadata();
    }

    return true;
}

// ------------------------------------------------------
// WebRTC
// ------------------------------------------------------

async function requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저는 마이크 입력을 지원하지 않습니다.");
    }

    return navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        },
        video: false
    });
}

function scheduleDisconnectGraceTimer({ reason = "webrtc_connection_disconnected", trigger = "rtc_state" } = {}) {
    if (disconnectGraceTimer) return;
    if (endSubmitted) return;
    if (!isActiveVoiceState()) return;

    disconnectGraceTimer = setTimeout(() => {
        disconnectGraceTimer = null;

        if (endSubmitted) return;
        if (!isActiveVoiceState()) return;

        const connectionState = pc ? pc.connectionState : null;
        const iceConnectionState = pc ? pc.iceConnectionState : null;

        const stillDisconnected = (
            ["disconnected", "failed", "closed"].includes(connectionState) ||
            ["disconnected", "failed", "closed"].includes(iceConnectionState)
        );

        if (!stillDisconnected) return;

        submitEndOnce({
            endedBy: "error",
            finalState: connectionState === "failed" || iceConnectionState === "failed" ? "failed" : "disconnected",
            exitReason: `${reason}_timeout`,
            exitConfidence: "medium",
            trigger: "disconnect_grace_timer",
            exitEvidence: {
                graceMs: CONFIG.DISCONNECT_GRACE_MS,
                connectionState,
                iceConnectionState,
                originalTrigger: trigger
            }
        }, {
            preferBeacon: false,
            auto: true,
            updateUi: true,
            resetRuntime: true
        });
    }, CONFIG.DISCONNECT_GRACE_MS);
}

function setupLocalAudioTrackMonitors(stream, sessionSeq) {
    try {
        const tracks = stream ? stream.getAudioTracks() : [];

        tracks.forEach((track) => {
            track.addEventListener("ended", () => {
                if (sessionSeq !== activeSessionSeq) return;
                if (endSubmitted) return;
                if (!isActiveVoiceState()) return;

                recordRtcState("local_audio_track_ended", {
                    trackId: track.id || null,
                    trackReadyState: track.readyState
                });

                submitEndOnce({
                    endedBy: "error",
                    finalState: "disconnected",
                    exitReason: "local_audio_track_ended",
                    exitConfidence: "medium",
                    trigger: "local_audio_track_ended",
                    exitEvidence: {
                        trackId: track.id || null,
                        trackReadyState: track.readyState
                    }
                }, {
                    preferBeacon: false,
                    auto: true,
                    updateUi: true,
                    resetRuntime: true
                });
            });

            track.addEventListener("mute", () => {
                if (sessionSeq !== activeSessionSeq) return;
                recordRtcState("local_audio_track_mute", {
                    trackId: track.id || null
                });
            });

            track.addEventListener("unmute", () => {
                if (sessionSeq !== activeSessionSeq) return;
                recordRtcState("local_audio_track_unmute", {
                    trackId: track.id || null
                });
            });
        });
    } catch (error) {
        console.warn("[Meeting AI] local audio track monitor setup failed:", error);
    }
}

function setupPeerConnection(sessionSeq) {
    const peer = new RTCPeerConnection();

    peer.ontrack = (event) => {
        if (sessionSeq !== activeSessionSeq) return;
        const [stream] = event.streams || [];
        if (!stream) return;
        remoteAudio.srcObject = stream;
        remoteAudio.play().catch((err) => {
            console.warn("[Meeting AI] remote audio autoplay failed:", err);
        });
    };

    peer.onconnectionstatechange = () => {
        if (sessionSeq !== activeSessionSeq) return;

        const state = peer.connectionState;
        recordRtcState("connectionstatechange", { connectionState: state });

        if (state === "connected") {
            clearDisconnectGraceTimer();
            setCallState("in_call", "통화 중");
            setButtons({ startDisabled: true, endDisabled: false });
            return;
        }

        if (state === "disconnected") {
            setStatus("연결이 불안정합니다", "error");
            scheduleDisconnectGraceTimer({
                reason: "webrtc_connection_disconnected",
                trigger: "connectionstatechange"
            });
            return;
        }

        if (state === "failed" && !endSubmitted && isActiveVoiceState()) {
            setStatus("연결 실패", "error");

            submitEndOnce({
                endedBy: "error",
                finalState: "failed",
                exitReason: "webrtc_connection_failed",
                exitConfidence: "high",
                trigger: "connectionstatechange",
                exitEvidence: {
                    connectionState: state,
                    iceConnectionState: peer.iceConnectionState || null
                }
            }, {
                preferBeacon: false,
                auto: true,
                updateUi: true,
                resetRuntime: true
            });
            return;
        }

        if (state === "closed" && !endSubmitted && isActiveVoiceState()) {
            setStatus("연결 종료됨", "ready");

            submitEndOnce({
                endedBy: "provider_ended",
                finalState: "disconnected",
                exitReason: "peer_connection_closed_without_user_button",
                exitConfidence: "medium",
                trigger: "connectionstatechange",
                exitEvidence: {
                    connectionState: state,
                    iceConnectionState: peer.iceConnectionState || null
                }
            }, {
                preferBeacon: false,
                auto: true,
                updateUi: true,
                resetRuntime: true
            });
        }
    };

    peer.oniceconnectionstatechange = () => {
        if (sessionSeq !== activeSessionSeq) return;

        const state = peer.iceConnectionState;
        recordRtcState("iceconnectionstatechange", { iceConnectionState: state });

        if (["connected", "completed"].includes(state)) {
            clearDisconnectGraceTimer();
            return;
        }

        if (state === "disconnected") {
            setStatus("네트워크 연결 불안정", "error");
            scheduleDisconnectGraceTimer({
                reason: "ice_connection_disconnected",
                trigger: "iceconnectionstatechange"
            });
            return;
        }

        if (state === "failed" && !endSubmitted && isActiveVoiceState()) {
            submitEndOnce({
                endedBy: "error",
                finalState: "failed",
                exitReason: "ice_connection_failed",
                exitConfidence: "high",
                trigger: "iceconnectionstatechange",
                exitEvidence: {
                    connectionState: peer.connectionState || null,
                    iceConnectionState: state
                }
            }, {
                preferBeacon: false,
                auto: true,
                updateUi: true,
                resetRuntime: true
            });
        }

        if (state === "closed" && !endSubmitted && isActiveVoiceState()) {
            submitEndOnce({
                endedBy: "provider_ended",
                finalState: "disconnected",
                exitReason: "ice_connection_closed_without_user_button",
                exitConfidence: "medium",
                trigger: "iceconnectionstatechange",
                exitEvidence: {
                    connectionState: peer.connectionState || null,
                    iceConnectionState: state
                }
            }, {
                preferBeacon: false,
                auto: true,
                updateUi: true,
                resetRuntime: true
            });
        }
    };

    return peer;
}

function sendRealtimeEvent(event) {
    if (!dataChannel || dataChannel.readyState !== "open") return false;
    dataChannel.send(JSON.stringify(event));
    return true;
}

function setupDataChannel(peer, { firstUtterance, sessionSeq }) {
    const channel = peer.createDataChannel("oai-events");

    channel.onopen = () => {
        if (sessionSeq !== activeSessionSeq) return;

        clearDataChannelCloseTimer();
        recordRtcState("data_channel_open");

        const instructions = firstUtterance
            ? [
                "Start the session now.",
                "Speak first.",
                "Use the prepared runtime context.",
                "Do not read internal IDs or system details aloud.",
                `Opening line to say naturally: ${firstUtterance}`
            ].join("\n")
            : [
                "Start the session now.",
                "Speak first.",
                "Use the prepared runtime context.",
                "Do not read internal IDs or system details aloud."
            ].join("\n");

        sendRealtimeEvent({
            type: "response.create",
            response: {
                modalities: ["audio", "text"],
                instructions
            }
        });
    };

    channel.onmessage = (messageEvent) => {
        const event = safeJsonParse(messageEvent.data);
        if (!event) {
            if (debugMode) {
                console.warn("[Realtime Event] non-json message:", messageEvent.data);
            }
            return;
        }

        if (debugMode) {
            console.log("[Realtime Event]", event.type, event);
        }

        // ------------------------------------------------------
        // Smoke Test A:
        // Verify whether OpenAI Realtime sends usable transcript events.
        //
        // Important:
        // - This does NOT buffer or send transcript chunks to n8n yet.
        // - This only prints candidate transcript events to the browser console.
        // - 15-second chunking must be added only after this smoke test passes.
        // ------------------------------------------------------

        const type = event.type || "";

        const isTranscriptCandidate =
            type === "conversation.item.input_audio_transcription.completed" ||
            type === "conversation.item.input_audio_transcription.failed" ||
            type === "response.output_audio_transcript.done" ||
            type === "response.output_text.done" ||
            type === "response.done";

        if (!debugMode || !isTranscriptCandidate) return;

        let role = "unknown";

        if (type === "conversation.item.input_audio_transcription.completed") {
            role = "user";
        } else if (type === "conversation.item.input_audio_transcription.failed") {
            role = "user";
        } else if (type === "response.output_audio_transcript.done") {
            role = "assistant";
        } else if (type === "response.output_text.done") {
            role = "assistant";
        } else if (type === "response.done") {
            role = "assistant_or_mixed";
        }

        let transcript =
            event.transcript ||
            event.text ||
            event.delta ||
            null;

        // Some Realtime events may carry text/transcript inside item.content.
        if (!transcript && Array.isArray(event.item?.content)) {
            const contentWithText = event.item.content.find((content) => {
                return (
                    typeof content?.transcript === "string" ||
                    typeof content?.text === "string"
                );
            });

            transcript =
                contentWithText?.transcript ||
                contentWithText?.text ||
                null;
        }

        // Some response.done events can contain nested output content.
        // For Smoke A, do not attempt complex parsing. Log the full event.
        // We only need to confirm whether usable transcript fields exist.
        console.log("[Transcript Candidate]", {
            type,
            role,
            itemId:
                event.item_id ||
                event.itemId ||
                event.item?.id ||
                null,
            responseId:
                event.response_id ||
                event.responseId ||
                event.response?.id ||
                null,
            transcript,
            hasTranscript: Boolean(transcript),
            event
        });
    };

    channel.onerror = (event) => {
        recordRtcState("data_channel_error", {
            dataChannelState: channel.readyState
        });

        console.error("[Meeting AI] DataChannel error:", event);
    };

    channel.onclose = () => {
        if (sessionSeq !== activeSessionSeq) return;

        recordRtcState("data_channel_closed", {
            dataChannelState: channel.readyState
        });

        if (debugMode) console.log("[Meeting AI] DataChannel closed");

        if (endSubmitted) return;
        if (!isActiveVoiceState()) return;

        clearDataChannelCloseTimer();

        dataChannelCloseTimer = setTimeout(() => {
            dataChannelCloseTimer = null;

            if (endSubmitted) return;
            if (!isActiveVoiceState()) return;

            submitEndOnce({
                endedBy: "provider_ended",
                finalState: "disconnected",
                exitReason: "data_channel_closed",
                exitConfidence: "medium",
                trigger: "data_channel_close_timer",
                exitEvidence: {
                    graceMs: CONFIG.DATA_CHANNEL_CLOSE_GRACE_MS,
                    dataChannelState: channel.readyState,
                    connectionState: pc ? pc.connectionState : null,
                    iceConnectionState: pc ? pc.iceConnectionState : null
                }
            }, {
                preferBeacon: false,
                auto: true,
                updateUi: true,
                resetRuntime: true
            });
        }, CONFIG.DATA_CHANNEL_CLOSE_GRACE_MS);
    };

    return channel;
}

function extractOpenAICallIdFromLocation(locationValue) {
    if (!locationValue) return null;

    const text = String(locationValue);

    // Examples we want to tolerate:
    // /v1/realtime/calls/rtc_xxx
    // https://api.openai.com/v1/realtime/calls/rtc_xxx
    const match = text.match(/\/realtime\/calls\/([^/?#]+)/);
    return match ? match[1] : null;
}

async function exchangeSdpWithOpenAI({ offerSdp, clientSecret, model }) {
    const url = `${CONFIG.OPENAI_REALTIME_SDP_URL}?model=${encodeURIComponent(model)}`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
            "Accept": "application/sdp"
        },
        body: offerSdp
    });

    const locationHeader = res.headers.get("Location") || res.headers.get("location");
    const openaiCallId = extractOpenAICallIdFromLocation(locationHeader);

    const answerSdp = await res.text();

    if (!res.ok) {
        throw new Error(`OpenAI SDP 교환 실패 (${res.status}): ${answerSdp.slice(0, 300)}`);
    }

    if (!answerSdp || !answerSdp.includes("v=0")) {
        throw new Error("OpenAI SDP answer가 유효하지 않습니다.");
    }

    return {
        answerSdp,
        openaiCallId
    };
}

async function cleanupRealtimeObjects() {
    clearExitTimers();

    try {
        if (dataChannel && dataChannel.readyState !== "closed") dataChannel.close();
    } catch (_) { }
    dataChannel = null;

    try {
        if (pc && pc.signalingState !== "closed") pc.close();
    } catch (_) { }
    pc = null;

    try {
        if (localStream) localStream.getTracks().forEach((track) => track.stop());
    } catch (_) { }
    localStream = null;

    try {
        remoteAudio.pause();
        remoteAudio.srcObject = null;
    } catch (_) { }
}

// ------------------------------------------------------
// Start / End
// ------------------------------------------------------

async function startCall() {
    if (!sessionToken) {
        alert("sessionToken이 없습니다. Salesforce 링크를 통해 다시 접속하세요.");
        return;
    }

    recordUserAction("start_button");

    const sessionSeq = ++activeSessionSeq;
    endSubmitted = false;
    clearExitTimers();

    startedAt = null;
    currentStartResponse = null;
    currentVoiceSessionId = null;
    currentRealtimeSessionId = null;
    currentOpenAICallId = null;
    currentClientCallId = createClientCallId();

    lifecycleEvents = [];
    rtcStateEvents = [];

    try {
        setCallState("validating");
        setButtons({ startDisabled: true, endDisabled: true });

        await cleanupRealtimeObjects();

        const startData = await postJson(
            CONFIG.START_REALTIME_WEBHOOK,
            buildStartPayload(),
            { timeoutMs: CONFIG.START_TIMEOUT_MS }
        );

        if (debugMode) console.log("[Meeting AI] start-realtime response:", startData);

        if (sessionSeq !== activeSessionSeq) return;

        if (!startData?.ok) {
            setCallState("blocked", startData?.message || "시작할 수 없음");
            setButtons({ startDisabled: false, endDisabled: true });
            return;
        }

        currentStartResponse = startData;
        currentVoiceSessionId = extractVoiceSessionId(startData);
        currentRealtimeSessionId = extractRealtimeSessionId(startData);

        const clientSecret = extractClientSecret(startData);
        const model = extractRealtimeModel(startData);
        const firstUtterance = extractFirstUtterance(startData);

        if (!clientSecret) {
            throw new Error("n8n start-realtime 응답에서 client_secret을 받지 못했습니다.");
        }

        if (debugMode) {
            console.log("[Meeting AI] extracted realtime contract:", {
                model,
                hasClientSecret: Boolean(clientSecret),
                realtimeSessionId: currentRealtimeSessionId,
                voiceSessionId: currentVoiceSessionId,
                clientCallId: currentClientCallId,
                firstUtterance
            });
        }

        setCallState("microphone");
        localStream = await requestMicrophone();
        setupLocalAudioTrackMonitors(localStream, sessionSeq);

        if (sessionSeq !== activeSessionSeq) return;

        setCallState("connecting");
        pc = setupPeerConnection(sessionSeq);

        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        });

        dataChannel = setupDataChannel(pc, { firstUtterance, sessionSeq });

        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });

        await pc.setLocalDescription(offer);

        const sdpResult = await exchangeSdpWithOpenAI({
            offerSdp: offer.sdp,
            clientSecret,
            model
        });

        if (sessionSeq !== activeSessionSeq) return;

        currentOpenAICallId = sdpResult.openaiCallId || null;

        if (debugMode) {
            console.log("[Meeting AI] SDP exchange result:", {
                hasAnswerSdp: Boolean(sdpResult.answerSdp),
                openaiCallId: currentOpenAICallId
            });
        }

        await pc.setRemoteDescription({
            type: "answer",
            sdp: sdpResult.answerSdp
        });

        startedAt = nowIso();

        setCallState("connecting", "응답 준비 중");
        setButtons({ startDisabled: true, endDisabled: false });

    } catch (error) {
        console.error("[Meeting AI] start failed:", error);

        const canNotifyEnd = Boolean(
            currentStartResponse ||
            currentVoiceSessionId ||
            currentRealtimeSessionId
        );

        if (canNotifyEnd && !endSubmitted) {
            await submitEndOnce({
                endedBy: "client_start_error",
                finalState: "start_failed",
                exitReason: classifyStartError(error),
                exitConfidence: "high",
                trigger: "start_call_catch",
                exitEvidence: {
                    errorMessage: safeErrorMessage(error)
                }
            }, {
                preferBeacon: false,
                auto: true,
                updateUi: false,
                resetRuntime: true
            });
        } else {
            await cleanupRealtimeObjects();
            resetRuntimeSessionMetadata();
        }

        document.documentElement.classList.remove("call-live");

        setCallState("error", "연결 실패");
        setButtons({ startDisabled: false, endDisabled: true });

        alert(error?.message || "통화 시작 중 오류가 발생했습니다.");
    }
}

async function endCall({ endedBy = "user_button", auto = false } = {}) {
    recordUserAction("end_button");

    if (endSubmitted) return;

    try {
        setCallState("ending");
        setButtons({ startDisabled: true, endDisabled: true });

        await submitEndOnce({
            endedBy,
            finalState: "ended",
            exitReason: "explicit_user_end",
            exitConfidence: "high",
            trigger: "end_button_click"
        }, {
            preferBeacon: false,
            auto,
            updateUi: true,
            resetRuntime: true
        });

    } catch (error) {
        console.error("[Meeting AI] end failed:", error);

        await cleanupRealtimeObjects();

        document.documentElement.classList.remove("call-live");

        setCallState("ended", "통화 종료됨");
        setButtons({ startDisabled: false, endDisabled: true });

        if (!auto) alert(error?.message || "통화 종료 중 오류가 발생했습니다.");
    }
}

// ------------------------------------------------------
// Browser lifecycle
// ------------------------------------------------------

function handleVisibilityChange() {
    recordLifecycleEvent("visibilitychange", {
        visibilityState: document.visibilityState || null
    });

    if (document.visibilityState !== "hidden") return;
    if (!sessionToken || endSubmitted) return;
    if (!isActiveVoiceState()) return;

    submitEndOnce({
        endedBy: "page_hidden",
        finalState: "interrupted",
        exitReason: "document_visibility_hidden",
        exitConfidence: "medium",
        trigger: "visibilitychange",
        exitEvidence: {
            visibilityState: document.visibilityState || null,
            documentHidden: Boolean(document.hidden)
        }
    }, {
        preferBeacon: true,
        auto: true,
        updateUi: true,
        resetRuntime: true
    });
}

function handlePageHide(event) {
    recordLifecycleEvent("pagehide", {
        persisted: Boolean(event?.persisted)
    });

    if (!sessionToken || endSubmitted) return;
    if (!isActiveVoiceState()) return;

    const persisted = Boolean(event?.persisted);

    submitEndOnce({
        endedBy: persisted ? "page_hidden" : "browser_closed",
        finalState: "interrupted",
        exitReason: persisted ? "pagehide_bfcache_or_history_navigation" : "pagehide_unload_or_navigation",
        exitConfidence: "medium",
        trigger: "pagehide",
        exitEvidence: {
            eventPersisted: persisted
        }
    }, {
        preferBeacon: true,
        auto: true,
        updateUi: false,
        resetRuntime: true
    });
}

function handleOffline() {
    recordLifecycleEvent("offline");

    if (!sessionToken || endSubmitted) return;
    if (!isActiveVoiceState()) return;

    setStatus("네트워크 연결 불안정", "error");

    scheduleDisconnectGraceTimer({
        reason: "network_offline_during_call",
        trigger: "offline"
    });
}

function handleOnline() {
    recordLifecycleEvent("online");

    if (!sessionToken || endSubmitted) return;
    if (!isActiveVoiceState()) return;

    clearDisconnectGraceTimer();
    setStatus(callState === "in_call" ? "통화 중" : "통화 연결 중", callState === "in_call" ? "active" : "pending");
}

document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("pagehide", handlePageHide);
window.addEventListener("offline", handleOffline);
window.addEventListener("online", handleOnline);

// ------------------------------------------------------
// Init
// ------------------------------------------------------

function initialize() {
    if (!sessionToken) {
        if (tokenValue) tokenValue.textContent = "Missing Token";
        setCallState("blocked", "Salesforce로 접속하세요");
        setButtons({ startDisabled: true, endDisabled: true });
        return;
    }

    // 토큰 파싱 → UI 분기 (title / subtitle / chipLabel / subjectHint)
    applySessionTypeUI();

    // subjectHint가 없는 default 케이스는 maskToken으로 표시
    const { type } = parseSessionToken(sessionToken);
    if (type === "default" && tokenValue) {
        tokenValue.textContent = maskToken(sessionToken);
    }

    setCallState("idle");
    setButtons({ startDisabled: false, endDisabled: true });

    recordLifecycleEvent("initialize");

    console.log("[Meeting AI] initialized", {
        version: APP_VERSION,
        hasSessionToken: Boolean(sessionToken),
        debugMode,
        startWebhook: CONFIG.START_REALTIME_WEBHOOK,
        endWebhook: CONFIG.END_REALTIME_WEBHOOK,
        sdpUrl: CONFIG.OPENAI_REALTIME_SDP_URL,
        fallbackModel: CONFIG.DEFAULT_REALTIME_MODEL
    });
}

btnStart?.addEventListener("click", startCall);

btnEnd?.addEventListener("click", () => {
    endCall({ endedBy: "user_button", auto: false });
});

initialize();