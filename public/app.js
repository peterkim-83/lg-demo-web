import { UltravoxSession } from 'https://esm.sh/ultravox-client@0.3.6';

window.UltravoxSession = UltravoxSession;
console.log('UltravoxSession loaded:', typeof window.UltravoxSession);

// ==========================================
// ⚙️ n8n Webhook URL 설정
// ==========================================
const CONFIG = {
  UC1_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/upload-pdf',
  UC1_STATUS_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/check-status',
  UC2_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/generate-proposal',
  UC3_START_CALL: 'https://peter-n8n.duckdns.org/webhook/ultravox-start',
  UC3_END_CALL: 'https://peter-n8n.duckdns.org/webhook/get-call-log'
};

// ==========================================
// 🏷️ 앱 버전 표시 (배포/캐시 확인용)
// ==========================================
const APP_VERSION = 'app.final.uc2-pdfjs-embed 2026-03-23-v5';
console.log(APP_VERSION);

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 🧭 네비게이션 (SPA 라우팅)
  // ==========================================
  const menuItems = document.querySelectorAll('.menu-item');
  const demoCards = document.querySelectorAll('.demo-card');
  const sections = document.querySelectorAll('.view-section');

  function switchView(targetId) {
    sections.forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(targetId);
    if (target) target.classList.add('active');

    menuItems.forEach(item => {
      if (item.dataset.target === targetId) item.classList.add('active');
      else item.classList.remove('active');
    });

    if (targetId !== 'view-uc3' && window.uvSession) {
      window.uvSession.leaveCall();
      window.uvSession = null;
    }
  }

  menuItems.forEach(item => item.addEventListener('click', () => switchView(item.dataset.target)));
  demoCards.forEach(card => card.addEventListener('click', () => switchView(card.dataset.target)));

  // ==========================================
  // 📄 Use Case 1: 지자체 PDF 추출 자동화 (Polling)
  // ✅ 정상 동작 버전 유지 - 수정 금지
  // ==========================================
  const UC1_POLL_INTERVAL_MS = 5000;

  const uc1Input = document.getElementById('pdfInput');
  const uc1FileName = document.getElementById('fileNameDisplay');
  const uc1Prompt = document.getElementById('uploadPrompt');
  const uc1Btn = document.getElementById('uc1-submitBtn');
  const uc1Form = document.getElementById('uc1-form');
  const uc1Loading = document.getElementById('uc1-loading');
  const uc1Result = document.getElementById('uc1-result');
  const uc1Download = document.getElementById('uc1-downloadLink');
  const uc1StatusMsg = uc1Loading.querySelector('.status-msg');

  let uc1PollTimer = null;
  let uc1CurrentBatchId = null;
  let uc1CurrentStatusUrl = null;
  let uc1StatusAbortController = null;

  function sanitizeBatchId(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('{{$json')) return '';
    if (trimmed.includes('={{$json')) return '';
    if (trimmed === 'undefined' || trimmed === 'null') return '';
    return trimmed;
  }

  function sanitizeStatusUrl(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('{{$json')) return '';
    if (trimmed.includes('={{$json')) return '';
    if (!/^https?:\/\//i.test(trimmed)) return '';
    return trimmed;
  }

  function extractBatchIdFromStatusUrl(statusUrl) {
    try {
      const url = new URL(statusUrl);
      return sanitizeBatchId(url.searchParams.get('batch_id') || '');
    } catch (_) {
      return '';
    }
  }

  function clearUC1Polling() {
    if (uc1PollTimer) {
      clearTimeout(uc1PollTimer);
      uc1PollTimer = null;
    }

    if (uc1StatusAbortController) {
      try {
        uc1StatusAbortController.abort();
      } catch (_) { }
      uc1StatusAbortController = null;
    }
  }

  function scheduleUC1Polling({ batchId, statusUrl }) {
    clearUC1Polling();
    uc1PollTimer = setTimeout(() => checkStatus({ batchId, statusUrl }), UC1_POLL_INTERVAL_MS);
  }

  uc1Input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      uc1Prompt.style.display = 'none';
      uc1FileName.textContent = file.name;
      uc1Btn.disabled = false;
    }
  });

  async function checkStatus({ batchId, statusUrl }) {
    try {
      clearUC1Polling();

      const safeBatchId = sanitizeBatchId(batchId || uc1CurrentBatchId);
      const safeStatusUrl = sanitizeStatusUrl(statusUrl || uc1CurrentStatusUrl || CONFIG.UC1_STATUS_WEBHOOK);

      if (!safeStatusUrl && !safeBatchId) {
        throw new Error('상태 조회에 필요한 batch_id 또는 status URL이 없습니다.');
      }

      uc1CurrentBatchId = safeBatchId || uc1CurrentBatchId;
      uc1CurrentStatusUrl = safeStatusUrl || uc1CurrentStatusUrl || CONFIG.UC1_STATUS_WEBHOOK;
      uc1StatusAbortController = new AbortController();

      const url = new URL(uc1CurrentStatusUrl || CONFIG.UC1_STATUS_WEBHOOK);

      if (safeBatchId && !url.searchParams.get('batch_id')) {
        url.searchParams.set('batch_id', safeBatchId);
      }

      url.searchParams.set('_', Date.now().toString()); // cache busting

      const res = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        signal: uc1StatusAbortController.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!res.ok) {
        throw new Error(`상태 확인 실패 (${res.status})`);
      }

      const rawText = await res.text();
      let data;

      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('check-status JSON parse error:', parseError, rawText);
        throw new Error('상태 응답(JSON) 파싱 실패');
      }

      console.log('check-status response:', data);

      const normalizedBatchId =
        sanitizeBatchId(data.split_batch_id) ||
        sanitizeBatchId(data.batch_id) ||
        safeBatchId;

      if (data.status === 'processing') {
        const serverMessage = data.message ? `\n${data.message}` : '';
        uc1StatusMsg.innerText =
          `현재 파이썬 워커가 데이터를 추출 중입니다...\n(Batch ID: ${normalizedBatchId || '확인 중'})${serverMessage}`;

        scheduleUC1Polling({
          batchId: normalizedBatchId || safeBatchId,
          statusUrl: uc1CurrentStatusUrl
        });
        return;
      }

      if (data.status === 'success' && data.merged_download_url) {
        clearUC1Polling();
        uc1Loading.style.display = 'none';
        uc1Result.style.display = 'block';
        uc1Download.href = data.merged_download_url;
        uc1Download.target = '_blank';
        uc1Download.rel = 'noopener noreferrer';
        return;
      }

      if (data.status === 'error') {
        throw new Error(data.message || '파이썬 처리 중 에러가 발생했습니다.');
      }

      throw new Error('알 수 없는 처리 결과입니다.');
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('UC1 polling error:', error);
      alert('처리 실패: ' + error.message);
      window.resetUC1();
    }
  }

  uc1Btn.addEventListener('click', async () => {
    const file = uc1Input.files[0];
    if (!file) return;

    clearUC1Polling();
    uc1CurrentBatchId = null;
    uc1CurrentStatusUrl = null;

    uc1Form.style.display = 'none';
    uc1Result.style.display = 'none';
    uc1StatusMsg.innerText = 'PDF 전송 및 구조 분석 시작 중...';
    uc1Loading.style.display = 'block';

    const formData = new FormData();
    formData.append('upload', file);

    try {
      const res = await fetch(CONFIG.UC1_WEBHOOK, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error(`서버 에러 (${res.status})`);
      }

      const data = await res.json();
      console.log('upload-pdf response:', data);

      const statusUrl =
        sanitizeStatusUrl(data.check_status_url);

      const splitBatchId =
        sanitizeBatchId(data.split_batch_id);

      const batchId =
        splitBatchId ||
        sanitizeBatchId(data.batch_id) ||
        extractBatchIdFromStatusUrl(statusUrl);

      if (!statusUrl && !batchId) {
        throw new Error('업로드 응답에서 batch_id/check_status_url을 받지 못했습니다.');
      }

      uc1CurrentBatchId = batchId || null;
      uc1CurrentStatusUrl = statusUrl || CONFIG.UC1_STATUS_WEBHOOK;

      uc1StatusMsg.innerText =
        `현재 파이썬 워커가 데이터를 추출 중입니다...\n(Batch ID: ${uc1CurrentBatchId || '확인 중'})`;

      checkStatus({
        batchId: uc1CurrentBatchId,
        statusUrl: uc1CurrentStatusUrl
      });
    } catch (error) {
      console.error('UC1 upload error:', error);
      alert('업로드 실패: ' + error.message);
      window.resetUC1();
    }
  });

  window.resetUC1 = () => {
    clearUC1Polling();
    uc1CurrentBatchId = null;
    uc1CurrentStatusUrl = null;

    uc1Input.value = '';
    uc1Prompt.style.display = 'block';
    uc1FileName.textContent = '';
    uc1Btn.disabled = true;
    uc1Form.style.display = 'block';
    uc1Loading.style.display = 'none';
    uc1Result.style.display = 'none';
    uc1Download.removeAttribute('href');
  };

  // ==========================================
  // 📊 Use Case 2: 제안서 초안 생성
  // ✅ 웹훅 연동 보완 + PDF.js iframe embed
  // ==========================================
  const uc2Company = document.getElementById('uc2-companyName');
  const uc2Template = document.getElementById('uc2-templateType');
  const uc2Btn = document.getElementById('uc2-runBtn');
  const uc2Loading = document.getElementById('uc2-loading');
  const uc2DownloadArea = document.getElementById('uc2-downloadArea');
  const uc2Placeholder = document.getElementById('uc2-placeholder');
  const uc2Frame = document.getElementById('uc2-pdfFrame');
  const uc2PptxLink = document.getElementById('uc2-pptxLink');
  const uc2PdfLink = document.getElementById('uc2-pdfLink');
  const uc2ViewerWrapper = document.querySelector('.viewer-wrapper');

  let uc2CurrentPdfViewUrl = '';
  let uc2ResizeTimer = null;

  function fitUC2Viewer() {
    if (!uc2ViewerWrapper || !uc2ViewerWrapper.parentElement) return;

    const rect = uc2ViewerWrapper.getBoundingClientRect();
    const bottomGap = 24;
    const minHeight = 260;

    const availableHeight = Math.max(
      minHeight,
      window.innerHeight - rect.top - bottomGap
    );

    const parentWidth = uc2ViewerWrapper.parentElement.clientWidth;
    const widthByHeight = availableHeight * (16 / 9);

    const finalWidth = Math.min(parentWidth, widthByHeight);
    const finalHeight = finalWidth * (9 / 16);

    uc2ViewerWrapper.style.width = `${finalWidth}px`;
    uc2ViewerWrapper.style.height = `${finalHeight}px`;
  }

  function normalizeUC2Template(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return 'hvac_template2';

    const templateMap = {
      standard: 'hvac_template2',
      '표준 템플릿': 'hvac_template2',
      hvac_template2: 'hvac_template2'
    };

    return templateMap[raw] || raw;
  }

  function normalizeUC2Url(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('{{$json')) return '';
    if (trimmed.includes('={{$json')) return '';
    return trimmed;
  }

  function looksLikePdfUrl(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim().toLowerCase();
    return /\.pdf($|[?#])/.test(v) || v.includes('application/pdf');
  }

  function pickFirstValidUrl(list) {
    return list.map(normalizeUC2Url).find(Boolean) || '';
  }

  function pickFirstPdfUrl(list) {
    return list
      .map(normalizeUC2Url)
      .find((url) => url && looksLikePdfUrl(url)) || '';
  }

  function buildUC2DownloadUrl(value) {
    const normalized = normalizeUC2Url(value);
    if (!normalized) return '';

    try {
      const url = new URL(normalized);
      url.searchParams.set('download', '1');
      return url.toString();
    } catch (_) {
      const separator = normalized.includes('?') ? '&' : '?';
      return `${normalized}${separator}download=1`;
    }
  }

  function buildUC2ViewerUrl(pdfViewUrl) {
    return `/pdf-embed.html?file=${encodeURIComponent(pdfViewUrl)}`;
  }

  function mountUC2Pdf(pdfViewUrl) {
    uc2CurrentPdfViewUrl = pdfViewUrl;

    const viewerUrl = buildUC2ViewerUrl(pdfViewUrl);

    uc2Frame.style.display = 'none';
    uc2Frame.removeAttribute('src');

    requestAnimationFrame(() => {
      fitUC2Viewer();
      uc2Frame.src = viewerUrl;
      uc2Frame.style.display = 'block';
    });
  }

  // 부모는 iframe 크기만 맞춘다.
  // iframe 내부 pdf-embed.html 이 자체적으로 resize 시 재렌더링한다.
  window.addEventListener('resize', () => {
    clearTimeout(uc2ResizeTimer);

    uc2ResizeTimer = setTimeout(() => {
      fitUC2Viewer();
    }, 180);
  });

  uc2Btn.addEventListener('click', async () => {
    if (!uc2Company.value.trim()) return alert('업체명을 입력하세요.');

    uc2Btn.disabled = true;
    uc2Btn.textContent = '처리 중...';
    uc2Placeholder.style.display = 'none';
    uc2Frame.style.display = 'none';
    uc2DownloadArea.style.display = 'none';
    uc2Loading.style.display = 'block';
    uc2Frame.removeAttribute('src');
    uc2CurrentPdfViewUrl = '';
    uc2PptxLink.removeAttribute('href');
    uc2PdfLink.removeAttribute('href');

    const payload = {
      companyName: uc2Company.value.trim(),
      template: normalizeUC2Template(uc2Template.value)
    };

    try {
      const res = await fetch(CONFIG.UC2_WEBHOOK, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`서버 에러 (${res.status})`);

      const rawText = await res.text();
      let data;

      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('UC2 JSON parse error:', parseError, rawText);
        throw new Error('제안서 생성 응답(JSON) 파싱 실패');
      }

      console.log('generate-proposal response:', data);

      if (data.status && data.status !== 'success') {
        throw new Error(data.message || data.error_detail || '제안서 생성 실패');
      }

      const pptxUrl = pickFirstValidUrl([
        data.pptxUrl,
        data.pptx_url,
        data.download_url
      ]);

      const pdfViewUrl = pickFirstPdfUrl([
        data.pdfViewUrl,
        data.pdf_view_url,
        data.pdfUrl,
        data.pdf_url,
        data.pdfDownloadUrl,
        data.pdf_download_url
      ]);

      const pdfDownloadUrl =
        pickFirstPdfUrl([
          data.pdfDownloadUrl,
          data.pdf_download_url,
          data.pdfViewUrl,
          data.pdf_view_url,
          data.pdfUrl,
          data.pdf_url
        ]) || buildUC2DownloadUrl(pdfViewUrl);

      if (!pptxUrl) throw new Error('PPTX 다운로드 URL을 받지 못했습니다.');
      if (!pdfViewUrl) {
        console.error('UC2 raw response:', data);
        throw new Error('유효한 PDF URL을 받지 못했습니다.');
      }

      uc2Loading.style.display = 'none';

      uc2PptxLink.href = pptxUrl;
      uc2PptxLink.target = '_blank';
      uc2PptxLink.rel = 'noopener noreferrer';

      uc2PdfLink.href = pdfDownloadUrl || pdfViewUrl;
      uc2PdfLink.target = '_blank';
      uc2PdfLink.rel = 'noopener noreferrer';

      uc2DownloadArea.style.display = 'flex';
      mountUC2Pdf(pdfViewUrl);
    } catch (error) {
      console.error('UC2 proposal error:', error);
      alert('생성 실패: ' + error.message);
      uc2Loading.style.display = 'none';
      uc2CurrentPdfViewUrl = '';
      uc2Placeholder.style.display = 'block';
      uc2Frame.style.display = 'none';
      uc2DownloadArea.style.display = 'none';
    } finally {
      uc2Btn.disabled = false;
      uc2Btn.textContent = '▶ 초안 생성';
    }
  });

  // ==========================================
  // 🎙️ Use Case 3: Voice Agent Callbot (WebRTC)
  // ✅ Ultravox WebRTC 연결 안정화
  // ==========================================
  const scripts = [
    `[Context: A corporate IT director calls to equip a large executive conference room and the main company lobby.]
Agent: Hello! You've reached LG Business Solutions. How can I help you upgrade your workspace today?
User: Hi there. We are setting up a new executive boardroom for Microsoft Teams meetings. We need a really wide, large interactive board.
Agent: Let me check that for you. For a large boardroom, our 105-inch 105TR5WP-B CreateBoard is an excellent choice for $13,333. It features an ultra-wide screen that is perfect for immersive video calls and supports Google Mobile Services. Would you like to hear about its audio features?
User: Yes, does it have its own speakers? We prefer an all-in-one setup.
Agent: Give me just a second to pull up the specs. Yes, it has built-in speakers and wireless connectivity, making it a true all-in-one solution. Are you also looking for any standard digital signage for your office lobby?
User: Actually, yes. We want something similar in size but just for displaying company news and videos in the lobby, no touch needed.
Agent: Let me check our standard signage lineup. I highly recommend the 105-inch 105BM5P-B Ultra Stretch Signage for $14,667. It offers a stunning 5-K resolution and includes a wireless screen share feature. Shall I send over a quote for both of these 105-inch displays?
User: That sounds perfect. Please send the quote to my email.
Agent: You've got it. I will send that over immediately. Have a wonderful day!`,

    `[Context: A restaurant franchise owner is looking for self-ordering solutions and a menu board system for a new location.]
Agent: Hello! You've reached LG Business Solutions. How can I help you upgrade your workspace today?
User: Hi, I'm opening a new fast-casual restaurant. Space is a bit tight, but we need a self-ordering kiosk that customers can use easily.
Agent: Let me check our kiosk options for compact spaces. We have the 22-inch 22KC3P-M self-service kiosk available for $2,400. It features a modular design that lets you easily attach peripherals like barcode scanners. Does this size sound like a good fit for your layout?
User: That size is great. We want to make sure it's accessible for all our customers, including wheelchair users. Can we adjust the height?
Agent: Give me just a second to verify the mounting options. Yes, it has versatile stand options sold separately, or it can be wall-mounted. When installed at the proper height, its touch interface perfectly supports ADA compliance. Do you also need any digital menu boards for behind the counter?
User: We were actually thinking about a seamless LED wall instead of standard TVs for a more premium look.
Agent: Let me look into our direct view LED signage. To power a stunning LED menu wall, you will use our CEAA LED Controller. You can also use LG Business Cloud to easily manage and update your menus remotely. Would you like me to connect you with an LED specialist to design the perfect wall size?
User: Yes, please set that up. And send me the details on that 22-inch kiosk.
Agent: I will arrange that consultation and email you the kiosk quote right away. Thank you for calling LG!`,

    `[Context: A hospital administrator is looking for patient room entertainment and a projector for a new staff training center.]
Agent: Hello! You've reached LG Business Solutions. How can I help you upgrade your workspace today?
User: Hello. We are outfitting a new hospital wing and need interactive TVs attached to flexible arms for the patient beds.
Agent: Let me check our healthcare lineup for you. I recommend the 15.6-inch 15LN766A model. It is a Pro:Centric Touch Screen Arm TV that includes a built-in web browser and apps for patient entertainment. Would you like to know more about its management system?
User: Yes, our IT team needs to be able to manage the apps and welcome screens centrally.
Agent: Give me just a second to confirm those details. Yes, the Pro:Centric platform allows your team to easily manage content and settings remotely across all patient rooms. Are you also upgrading the technology in your staff training rooms?
User: We are. We need a really bright projector for our main lecture hall, something that is easy to use.
Agent: Let me check our ProBeam lineup. The BF50RG is a high-performance laser projector that outputs 5000 lumens for $2,399.99. It runs on our webOS platform, making it incredibly user-friendly for your staff. Would you like me to add the projector and the patient TVs to a formal proposal?
User: That would be incredibly helpful. Send it over whenever you can.
Agent: I will get that proposal generated and sent to your inbox shortly. Have a great afternoon!`
  ];

  let curScript = 0;
  const scriptBody = document.getElementById('uc3-scriptContent');
  const pageInd = document.getElementById('uc3-pageIndicator');

  function escapeHtml(str) {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function renderScriptMarkup(scriptText) {
    return scriptText
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return '<div class="script-spacer"></div>';
        }

        if (trimmed.startsWith('[Context:')) {
          return `<div class="script-line context-line"><span class="context-text">${escapeHtml(trimmed)}</span></div>`;
        }

        if (trimmed.startsWith('Agent:')) {
          const content = trimmed.replace(/^Agent:\s*/, '');
          return `
            <div class="script-line agent-line">
              <span class="speaker-badge agent-badge">Agent</span>
              <div class="agent-text">${escapeHtml(content)}</div>
            </div>
          `;
        }

        if (trimmed.startsWith('User:')) {
          const content = trimmed.replace(/^User:\s*/, '');
          return `
            <div class="script-line user-line">
              <span class="speaker-badge user-badge">User</span>
              <div class="user-text">${escapeHtml(content)}</div>
            </div>
          `;
        }

        return `<div class="script-line"><div class="script-free">${escapeHtml(trimmed)}</div></div>`;
      })
      .join('');
  }

  const updateScript = () => {
    scriptBody.innerHTML = renderScriptMarkup(scripts[curScript]);
    pageInd.innerText = `< ${curScript + 1} / ${scripts.length} >`;
  };

  document.getElementById('uc3-prevBtn').addEventListener('click', () => {
    if (curScript > 0) {
      curScript--;
      updateScript();
    }
  });

  document.getElementById('uc3-nextBtn').addEventListener('click', () => {
    if (curScript < scripts.length - 1) {
      curScript++;
      updateScript();
    }
  });

  updateScript();

  const uc3Start = document.getElementById('uc3-startBtn');
  const uc3End = document.getElementById('uc3-endBtn');
  const uc3Visualizer = document.getElementById('uc3-visualizer');
  const uc3Loading = document.getElementById('uc3-loading');
  const uc3LogArea = document.getElementById('uc3-logArea');
  const uc3LogContent = document.getElementById('uc3-logContent');
  const uc3StatusText = document.getElementById('uc3-statusText');

  let currentCallId = null;
  let isUC3Ending = false;
  let uc3SessionSeq = 0;
  let activeUc3SessionSeq = 0;

  function resetUC3ToIdle(startLabel = '&#128222; 통화 시작') {
    uc3StatusText.innerText = '대기 중';
    uc3Loading.style.display = 'none';
    uc3Visualizer.style.display = 'none';
    uc3End.style.display = 'none';
    uc3Start.style.display = 'flex';
    uc3Start.disabled = false;
    uc3Start.innerHTML = startLabel;
  }

  function clearUC3LogView() {
    uc3LogArea.style.display = 'none';
    uc3LogContent.innerHTML = '';
  }

  async function safeLeaveCurrentSession() {
    if (!window.uvSession) return;

    const sessionToClose = window.uvSession;
    window.uvSession = null;

    try {
      await sessionToClose.leaveCall();
    } catch (leaveError) {
      console.warn('Ultravox leaveCall warning:', leaveError);
    }
  }

  function createCallLogCard(data) {
    function escapeHtml(str) {
      return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function extractSummary(value) {
      if (!value) return '요약 정보가 없습니다.';

      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || '요약 정보가 없습니다.';
      }

      if (typeof value === 'object') {
        return (
          value.text ||
          value.summary ||
          value.oneLine ||
          value.one_line ||
          value.result ||
          value.output ||
          '요약 정보가 없습니다.'
        );
      }

      return String(value).trim() || '요약 정보가 없습니다.';
    }

    function extractConversation(value) {
      if (!value) return [];

      // ["1) Agent: ...", "2) User: ..."]
      if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
        return value
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const matched = line.match(/^\s*(\d+)\)\s*(Agent|User)\s*:\s*(.*)$/i);
            if (matched) {
              return {
                index: Number(matched[1]),
                role: matched[2],
                text: matched[3] || ''
              };
            }
            return {
              index: null,
              role: 'Agent',
              text: line
            };
          });
      }

      // [{ role: "Agent", text: "..." }, ...]
      if (Array.isArray(value) && value.every(item => typeof item === 'object')) {
        return value
          .map((item, idx) => ({
            index: idx + 1,
            role: String(item.role || '').trim() || 'Agent',
            text: String(item.text || '').trim()
          }))
          .filter(item => item.text);
      }

      return [];
    }

    const summary = extractSummary(
      data.summary ||
      data.ai_summary ||
      data.calls_summary ||
      data.data?.summary
    );

    const conversation = extractConversation(
      data.conversation ||
      data.data?.conversation
    );

    const status = String(
      data.status ||
      data.intent ||
      data.call_status ||
      data.data?.status ||
      'success'
    );

    let badgeClass = 'info';
    const s = status.toLowerCase();
    if (s.includes('성공') || s.includes('success') || s.includes('완료') || s.includes('complete')) badgeClass = 'success';
    if (s.includes('대기') || s.includes('중단') || s.includes('pending') || s.includes('cancel')) badgeClass = 'warning';

    const conversationHtml = conversation.length > 0
      ? `
        <div class="log-section">
          <span class="log-label">대화 내용</span>
          <div class="conversation-list">
            ${conversation.map(item => {
              const role = String(item.role || 'Agent');
              const isUser = role.toLowerCase() === 'user';
              return `
                <div class="conversation-item ${isUser ? 'user-turn' : 'agent-turn'}">
                  <div class="conversation-meta">
                    <span class="conversation-index">${item.index ?? '-'}</span>
                    <span class="conversation-role ${isUser ? 'user-role' : 'agent-role'}">${escapeHtml(role)}</span>
                  </div>
                  <div class="conversation-text">${escapeHtml(item.text || '')}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `
      : `
        <div class="log-section">
          <span class="log-label">대화 내용</span>
          <div class="log-value">표시할 대화 내용이 없습니다.</div>
        </div>
      `;

    return `
      <div class="log-card calllog-card">
        <div class="log-card-header">
          <h4>🎤 AI 통화 분석 리포트</h4>
          <span class="status-badge ${badgeClass}">${escapeHtml(status)}</span>
        </div>

        <div class="log-card-body">
          <div class="log-section">
            <span class="log-label">대화 요약</span>
            <div class="log-value summary-highlight">${escapeHtml(summary)}</div>
          </div>

          ${conversationHtml}

          <div class="raw-json-area">
            <details>
              <summary class="raw-json-toggle">🔍 원본 JSON 데이터 보기</summary>
              <pre style="font-size: 0.7rem; background: #f1f5f9; padding: 10px; margin-top: 8px; border-radius: 6px; overflow-x: auto; border: 1px solid #e2e8f0;">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
            </details>
          </div>
        </div>
      </div>
    `;
  }

  async function finalizeUC3Call({
    autoTriggered = false,
    sessionSeq = activeUc3SessionSeq,
    forceCallId = null,
  } = {}) {
    if (isUC3Ending) return;

    const targetCallId = forceCallId || currentCallId;

    // 이미 다른 새 세션이 시작된 뒤 예전 세션이 늦게 finalize를 시도하는 것 방지
    if (sessionSeq !== activeUc3SessionSeq) {
      console.warn('Skip stale finalize request:', { sessionSeq, activeUc3SessionSeq, targetCallId });
      return;
    }

    if (!targetCallId) {
      console.warn('Skip finalize because callId is empty:', { sessionSeq, activeUc3SessionSeq });
      return;
    }

    isUC3Ending = true;

    try {
      uc3StatusText.innerText = autoTriggered ? '통화 종료됨. 콜 로그 처리 중...' : '콜 로그 처리 중...';
      uc3End.style.display = 'none';
      uc3Visualizer.style.display = 'none';
      clearUC3LogView();
      uc3Loading.style.display = 'block';

      await safeLeaveCurrentSession();

      const res = await fetch(CONFIG.UC3_END_CALL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ callId: targetCallId })
      });

      if (!res.ok) {
        throw new Error(`로그 데이터 수신 실패 (${res.status})`);
      }

      const logData = await res.json();

      // 응답이 돌아오는 동안 사용자가 새 통화를 다시 시작했으면, 오래된 응답은 버린다.
      if (sessionSeq !== activeUc3SessionSeq) {
        console.warn('Discard stale log response:', { sessionSeq, activeUc3SessionSeq, targetCallId });
        return;
      }

      uc3Loading.style.display = 'none';
      uc3StatusText.innerText = '대기 중';
      uc3LogContent.innerHTML = createCallLogCard(logData);
      uc3LogArea.style.display = 'flex';
    } catch (error) {
      if (sessionSeq !== activeUc3SessionSeq) {
        console.warn('Discard stale finalize error:', { sessionSeq, activeUc3SessionSeq, error });
        return;
      }

      console.error('UC3 finalize error:', error);
      uc3Loading.style.display = 'none';
      uc3StatusText.innerText = '대기 중';
      uc3LogContent.innerHTML = `
        <div style="color: var(--danger); padding: 16px; background: #fee2e2; border-radius: 8px; border: 1px solid #fecaca;">
          <strong>⚠️ 데이터 로드 실패</strong><br>
          <span style="font-size: 0.85rem;">${error.message}</span>
        </div>
      `;
      uc3LogArea.style.display = 'flex';
    } finally {
      if (sessionSeq === activeUc3SessionSeq) {
        currentCallId = null;
        isUC3Ending = false;
        resetUC3ToIdle('&#128222; 통화 다시 시작');
      } else {
        isUC3Ending = false;
      }
    }
  }

  function bindUltravoxSessionEvents(session, sessionSeq) {
    session.addEventListener('status', async () => {
      // 이미 현재 활성 세션이 아니면 UI/종료 처리에서 제외
      if (sessionSeq !== activeUc3SessionSeq) return;

      const status = session.status;
      console.log('Ultravox Call Status:', status, 'sessionSeq=', sessionSeq);

      if (status === 'connecting') {
        uc3StatusText.innerText = '통화 연결 중...';
        return;
      }

      if (['idle', 'listening', 'thinking', 'speaking'].includes(status)) {
        uc3StatusText.innerText = `통화 중 (${status})`;
        uc3Start.style.display = 'none';
        uc3End.style.display = 'flex';
        uc3Visualizer.style.display = 'flex';
        uc3Loading.style.display = 'none';
        clearUC3LogView();
        return;
      }

      if (status === 'disconnecting') {
        uc3StatusText.innerText = '통화 종료 중...';
        return;
      }

      if (status === 'disconnected') {
        uc3StatusText.innerText = '통화 종료됨';

        if (currentCallId && !isUC3Ending) {
          await finalizeUC3Call({
            autoTriggered: true,
            sessionSeq,
            forceCallId: currentCallId
          });
        }
      }
    });

    session.addEventListener('transcripts', () => {
      if (sessionSeq !== activeUc3SessionSeq) return;
      console.log('Ultravox transcripts:', session.transcripts);
    });

    session.addEventListener('experimental_message', (event) => {
      if (sessionSeq !== activeUc3SessionSeq) return;
      console.log('Ultravox experimental_message:', event);
    });
  }

  uc3Start.addEventListener('click', async () => {
    try {
      if (typeof window.UltravoxSession === 'undefined') {
        throw new Error('Ultravox SDK가 브라우저에 로드되지 않았습니다.');
      }

      const nextSessionSeq = ++uc3SessionSeq;
      activeUc3SessionSeq = nextSessionSeq;
      isUC3Ending = false;
      currentCallId = null;

      uc3Start.disabled = true;
      uc3Start.innerText = 'URL 발급 중...';
      uc3StatusText.innerText = '연결 준비 중...';
      uc3Loading.style.display = 'none';
      clearUC3LogView();

      await safeLeaveCurrentSession();

      const res = await fetch(CONFIG.UC3_START_CALL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error(`웹훅 호출 실패 (${res.status})`);
      }

      const data = await res.json();
      console.log('UC3 start-call response:', data);

      // 사용자가 그 사이에 다시 새 세션을 시작했으면 이 응답은 버림
      if (nextSessionSeq !== activeUc3SessionSeq) {
        console.warn('Discard stale start-call response:', { nextSessionSeq, activeUc3SessionSeq });
        return;
      }

      const joinUrl = data.joinUrl || data.join_url || data?.data?.joinUrl || data?.data?.join_url || '';
      const callId = data.callId || data.call_id || data?.data?.callId || data?.data?.call_id || null;

      if (!joinUrl) {
        throw new Error('올바른 joinUrl을 받지 못했습니다.');
      }

      currentCallId = callId;

      uc3Start.innerText = '마이크 권한 요청 중...';
      uc3StatusText.innerText = '마이크 권한을 확인하고 있습니다.';

      const session = new window.UltravoxSession();
      window.uvSession = session;
      bindUltravoxSessionEvents(session, nextSessionSeq);

      await session.joinCall(joinUrl);
    } catch (error) {
      console.error('Voice Agent Error:', error);
      alert('통화 연결 실패: ' + error.message);

      await safeLeaveCurrentSession();

      // 시작 실패 시에만 현재 활성 세션 상태를 초기화
      currentCallId = null;
      isUC3Ending = false;
      clearUC3LogView();
      resetUC3ToIdle();
    }
  });

  uc3End.addEventListener('click', async () => {
    await finalizeUC3Call({
      autoTriggered: false,
      sessionSeq: activeUc3SessionSeq,
      forceCallId: currentCallId
    });
  });
});