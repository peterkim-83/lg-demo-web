// ======================================================
// Meeting AI Voice Session App
// Integrated mobile UI + OpenAI Realtime WebRTC Core
//
// 역할:
// - Salesforce URL에서 sessionToken 수신
// - n8n start-realtime webhook 호출
// - n8n이 조립한 OpenAI Realtime session/client_secret으로 WebRTC 연결
// - 사용자가 종료하면 WebRTC close + n8n end-realtime 종료 시그널 전송
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
    END_TIMEOUT_MS: 10000
};

const APP_VERSION = "meeting-ai-voice-session.mobile.v2.3-token-ui-branch";
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

let timerInterval = null;
let seconds = 0;

// ------------------------------------------------------
// Session Token UI Branch
// ------------------------------------------------------
// 토큰 형식: {prefix}-{subjectHint(최대10자, 공백→_)}-{EventId}
// prefix: "pre" | "post" | 그 외(default/test)

const SESSION_TYPE_CONFIG = {
    pre: {
        badge: "SMART COACH",
        title: "Smart Coach",
        subtitle: "Agent가 조사한 정보를 기반으로 미팅 준비를 도와 드릴게요!",
        chipLabel: "SUBJECT"
    },
    post: {
        badge: "MEETING SUPPORT",
        title: "Meeting Support",
        subtitle: "Agent와 오늘의 미팅을 요약하고, 후속 아이템을 정리해 드릴게요!",
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
    const prefixLen = type === "pre" ? 4 : 5;        // "pre-"=4, "post-"=5
    const withoutPrefix = token.slice(prefixLen);          // "GS건설_차세대-00U..."
    const dashIdx = withoutPrefix.indexOf("-");
    const rawHint = dashIdx !== -1 ? withoutPrefix.slice(0, dashIdx) : withoutPrefix;
    const subjectHint = rawHint.replace(/_/g, " ");      // "_" → 공백 복원

    return { type, subjectHint: subjectHint || null };
}

function applySessionTypeUI() {
    const { type, subjectHint } = parseSessionToken(sessionToken);
    const cfg = SESSION_TYPE_CONFIG[type];

    const badgeEl = document.querySelector(".badge");
    const titleEl = document.querySelector(".page-title");
    const subtitleEl = document.querySelector(".page-subtitle");
    const chipLabelEl = document.querySelector(".info-chip-label");

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
    statusDot.textContent = message;
    statusDot.className = `info-chip-value status-dot ${stateClass}`;
}

function setVisualizerActive(isActive) {
    if (micInner) micInner.classList.toggle("active", Boolean(isActive));
    if (waveform) waveform.classList.toggle("active", Boolean(isActive));
}

function setCallState(nextState, message) {
    callState = nextState;

    const defaultMessage = {
        idle: "Ready",
        validating: "\uc138\uc158 \ud655\uc778 \uc911",
        microphone: "\ub9c8\uc774\ud06c \ud655\uc778 \uc911",
        connecting: "\ud1b5\ud654 \uc5f0\uacb0 \uc911",
        in_call: "\ud1b5\ud654 \uc911",
        ending: "\ud1b5\ud654 \uc885\ub8cc \uc911",
        ended: "\ud1b5\ud654 \uc885\ub8cc\ub428",
        blocked: "\uc2dc\uc791 \ubd88\uac00",
        error: "\uc624\ub958 \ubc1c\uc0dd"
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
            if (!data) throw new Error(`JSON \uc751\ub2f5 \ud30c\uc2f1 \uc2e4\ud328: ${rawText.slice(0, 160)}`);
        }

        if (!res.ok) {
            throw new Error(data?.message || data?.error || `\uc11c\ubc84 \uc751\ub2f5 \uc624\ub958 (${res.status})`);
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
        pageUrl: window.location.href,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        userAgent: navigator.userAgent,
        requestedAt: nowIso()
    };
}

function buildEndPayload({ endedBy = "user_button", finalState = "ended" } = {}) {
    const endedAt = nowIso();

    const durationSec = startedAt
        ? Math.max(0, Math.round(
            (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
        ))
        : 0;

    return {
        sessionToken,
        sessionId: currentStartResponse?.sessionId || null,
        sessionType: currentStartResponse?.sessionType || null,
        provider: "openai_realtime",

        voiceSessionId: currentVoiceSessionId,
        realtimeSessionId: currentRealtimeSessionId,

        startedAt,
        endedAt,
        durationSec,
        endedBy,
        finalState,

        browser: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
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

// ------------------------------------------------------
// WebRTC
// ------------------------------------------------------

async function requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("\uc774 \ube0c\ub77c\uc6b0\uc800\ub294 \ub9c8\uc774\ud06c \uc785\ub825\uc744 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
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

        if (debugMode) console.log("[Meeting AI] connectionState:", state);

        if (state === "connected") {
            setCallState("in_call", "\ud1b5\ud654 \uc911");
            setButtons({ startDisabled: true, endDisabled: false });
        }

        if (["failed", "disconnected"].includes(state) && !endSubmitted) {
            setStatus("\uc5f0\uacb0\uc774 \ub04a\uc5b4\uc84c\uc2b5\ub2c8\ub2e4", "error");
        }

        if (state === "closed" && !endSubmitted) {
            setStatus("\uc5f0\uacb0 \uc885\ub8cc\ub428", "ready");
        }
    };

    peer.oniceconnectionstatechange = () => {
        if (debugMode) console.log("[Meeting AI] iceConnectionState:", peer.iceConnectionState);
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
        if (debugMode && event) console.log("[Realtime Event]", event.type, event);
    };

    channel.onerror = (event) => {
        console.error("[Meeting AI] DataChannel error:", event);
    };

    channel.onclose = () => {
        if (debugMode) console.log("[Meeting AI] DataChannel closed");
    };

    return channel;
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

    const answerSdp = await res.text();

    if (!res.ok) {
        throw new Error(`OpenAI SDP \uad50\ud658 \uc2e4\ud328 (${res.status}): ${answerSdp.slice(0, 300)}`);
    }

    if (!answerSdp || !answerSdp.includes("v=0")) {
        throw new Error("OpenAI SDP answer\uac00 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
    }

    return answerSdp;
}

async function cleanupRealtimeObjects() {
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
        alert("sessionToken\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. Salesforce \ub9c1\ud06c\ub97c \ud1b5\ud574 \ub2e4\uc2dc \uc811\uc18d\ud558\uc138\uc694.");
        return;
    }

    const sessionSeq = ++activeSessionSeq;
    endSubmitted = false;
    startedAt = null;
    currentStartResponse = null;
    currentVoiceSessionId = null;
    currentRealtimeSessionId = null;

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
            setCallState("blocked", startData?.message || "\uc2dc\uc791\ud560 \uc218 \uc5c6\uc74c");
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
            throw new Error("n8n start-realtime \uc751\ub2f5\uc5d0\uc11c client_secret\uc744 \ubc1b\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
        }

        if (debugMode) {
            console.log("[Meeting AI] extracted realtime contract:", {
                model,
                hasClientSecret: Boolean(clientSecret),
                realtimeSessionId: currentRealtimeSessionId,
                voiceSessionId: currentVoiceSessionId,
                firstUtterance
            });
        }

        setCallState("microphone");
        localStream = await requestMicrophone();

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

        const answerSdp = await exchangeSdpWithOpenAI({
            offerSdp: offer.sdp,
            clientSecret,
            model
        });

        if (sessionSeq !== activeSessionSeq) return;

        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        startedAt = nowIso();

        setCallState("connecting", "\uc751\ub2f5 \uc900\ube44 \uc911");
        setButtons({ startDisabled: true, endDisabled: false });

    } catch (error) {
        console.error("[Meeting AI] start failed:", error);

        await cleanupRealtimeObjects();

        if (currentStartResponse || currentVoiceSessionId || currentRealtimeSessionId) {
            notifyEndBestEffort(buildEndPayload({
                endedBy: "client_start_error",
                finalState: "start_failed"
            }));
        }

        currentStartResponse = null;
        currentVoiceSessionId = null;
        currentRealtimeSessionId = null;
        startedAt = null;

        setCallState("error", "\uc5f0\uacb0 \uc2e4\ud328");
        setButtons({ startDisabled: false, endDisabled: true });

        alert(error?.message || "\ud1b5\ud654 \uc2dc\uc791 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.");
    }
}

async function endCall({ endedBy = "user_button", auto = false } = {}) {
    if (endSubmitted) return;

    endSubmitted = true;

    try {
        setCallState("ending");
        setButtons({ startDisabled: true, endDisabled: true });

        const payload = buildEndPayload({ endedBy, finalState: "ended" });

        await cleanupRealtimeObjects();

        notifyEndBestEffort(payload);

        setCallState("ended", "\ud1b5\ud654 \uc885\ub8cc\ub428");
        setButtons({ startDisabled: false, endDisabled: true });

    } catch (error) {
        console.error("[Meeting AI] end failed:", error);

        await cleanupRealtimeObjects();

        setCallState("ended", "\ud1b5\ud654 \uc885\ub8cc\ub428");
        setButtons({ startDisabled: false, endDisabled: true });

        if (!auto) alert(error?.message || "\ud1b5\ud654 \uc885\ub8cc \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.");

    } finally {
        currentStartResponse = null;
        currentVoiceSessionId = null;
        currentRealtimeSessionId = null;
        startedAt = null;
    }
}

// ------------------------------------------------------
// Browser lifecycle
// ------------------------------------------------------

function bestEffortEndOnPageHide() {
    if (!sessionToken || endSubmitted) return;
    if (!["connecting", "in_call", "microphone"].includes(callState)) return;

    endSubmitted = true;

    const payload = buildEndPayload({
        endedBy: "page_hidden",
        finalState: "interrupted"
    });

    try {
        const blob = new Blob([JSON.stringify(payload)], {
            type: "text/plain;charset=UTF-8"
        });
        navigator.sendBeacon?.(CONFIG.END_REALTIME_WEBHOOK, blob);
    } catch (_) { }

    cleanupRealtimeObjects();
}

window.addEventListener("pagehide", bestEffortEndOnPageHide);

// ------------------------------------------------------
// Init
// ------------------------------------------------------

function initialize() {
    if (!sessionToken) {
        if (tokenValue) tokenValue.textContent = "Missing Token";
        setCallState("blocked", "Salesforce\ub85c \uc811\uc18d\ud558\uc138\uc694");
        setButtons({ startDisabled: true, endDisabled: true });
        return;
    }

    // 토큰 파싱 → UI 분기 (badge / title / subtitle / chipLabel / subjectHint)
    applySessionTypeUI();

    // subjectHint가 없는 default 케이스는 maskToken으로 표시
    const { type } = parseSessionToken(sessionToken);
    if (type === "default" && tokenValue) {
        tokenValue.textContent = maskToken(sessionToken);
    }

    setCallState("idle");
    setButtons({ startDisabled: false, endDisabled: true });

    console.log("[Meeting AI] initialized", {
        version: APP_VERSION,
        hasSessionToken: Boolean(sessionToken),
        debugMode,
        startWebhook: CONFIG.START_REALTIME_WEBHOOK,
        sdpUrl: CONFIG.OPENAI_REALTIME_SDP_URL,
        fallbackModel: CONFIG.DEFAULT_REALTIME_MODEL
    });
}

btnStart?.addEventListener("click", startCall);

btnEnd?.addEventListener("click", () => {
    endCall({ endedBy: "user_button", auto: false });
});

initialize();
