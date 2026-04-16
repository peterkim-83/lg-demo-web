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
  UC3_END_CALL: 'https://peter-n8n.duckdns.org/webhook/get-call-log',
  UC4_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/text-to-sql-webapp'
};

// ==========================================
// 🏷️ 앱 버전 표시 (배포/캐시 확인용)
// ==========================================
const APP_VERSION = 'app.final.uc4-runtime-webhook 2026-04-15-v1';
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
  const uc2PrimaryLabel = document.getElementById('uc2-primaryLabel');
  const uc2InputHint = document.getElementById('uc2-inputHint');
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
  let uc2LastTemplateId = '';

  const UC2_TEMPLATE_META = {
    hvac_template2: {
      label: '고객 업체명',
      placeholder: '고객 업체명 (예: Marriott International)',
      hint: '기업명을 입력하면 CRM/Web Search 기반 맞춤형 제안서를 생성합니다.',
      payloadKey: 'companyName',
      emptyMessage: '고객 업체명을 입력하세요.'
    },
    built_in_commercial: {
      label: 'LG 제품 모델명',
      placeholder: 'LG 제품 모델명 (예: BEI3GQLO)',
      hint: '제품 제안서는 모델명을 기준으로 n8n 데이터 테이블에서 제품 정보를 조회합니다.',
      payloadKey: 'modelName',
      emptyMessage: 'LG 제품 모델명을 입력하세요.'
    }
  };

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
      premium: 'hvac_template2',
      '표준 템플릿': 'hvac_template2',
      '기업 제안서': 'hvac_template2',
      hvac_template: 'hvac_template2',
      hvac_template2: 'hvac_template2',
      built_in_commercial: 'built_in_commercial',
      builtin_commercial: 'built_in_commercial',
      'built-in-commercial': 'built_in_commercial',
      '제품 제안서': 'built_in_commercial',
      'Built-in-Commercial.pptx': 'built_in_commercial'
    };

    return templateMap[raw] || raw;
  }

  function getUC2TemplateMeta(templateId) {
    return UC2_TEMPLATE_META[templateId] || UC2_TEMPLATE_META.hvac_template2;
  }

  function syncUC2InputByTemplate({ preserveValue = false } = {}) {
    const normalizedTemplate = normalizeUC2Template(uc2Template.value);
    const templateMeta = getUC2TemplateMeta(normalizedTemplate);

    uc2Template.value = normalizedTemplate;
    uc2PrimaryLabel.textContent = templateMeta.label;
    uc2Company.placeholder = templateMeta.placeholder;
    uc2InputHint.textContent = templateMeta.hint;

    if (!preserveValue || normalizedTemplate !== uc2LastTemplateId) {
      uc2Company.value = '';
    }

    uc2LastTemplateId = normalizedTemplate;
  }

  function pickFirstValidUrl(candidates) {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
        return candidate.trim();
      }
    }
    return '';
  }

  function isLikelyPdfUrl(url) {
    return typeof url === 'string' && /\.pdf(?:$|[?#])/i.test(url);
  }

  function pickFirstPdfUrl(candidates) {
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (!/^https?:\/\//i.test(trimmed)) continue;
      if (isLikelyPdfUrl(trimmed) || trimmed.includes('/file/') || trimmed.includes('/files/')) {
        return trimmed;
      }
    }
    return '';
  }

  function buildUC2DownloadUrl(pdfViewUrl) {
    if (!pdfViewUrl) return '';
    try {
      const url = new URL(pdfViewUrl);
      if (url.pathname.endsWith('/view')) {
        url.pathname = url.pathname.replace(/\/view$/, '/download');
        return url.toString();
      }
      return pdfViewUrl;
    } catch (_) {
      return pdfViewUrl;
    }
  }

  function buildUC2EmbedUrl(pdfViewUrl) {
    if (!pdfViewUrl) return '';

    const encoded = encodeURIComponent(pdfViewUrl);

    // pdf-embed.html은 file 파라미터를 읽는다.
    // src도 함께 실어두어 혹시 기존 호환 코드가 있어도 깨지지 않게 한다.
    return `pdf-embed.html?file=${encoded}&src=${encoded}`;
  }

  window.addEventListener('resize', () => {
    clearTimeout(uc2ResizeTimer);
    uc2ResizeTimer = setTimeout(() => {
      fitUC2Viewer();
    }, 180);
  });

  syncUC2InputByTemplate({ preserveValue: true });
  uc2Template.addEventListener('change', () => syncUC2InputByTemplate());

  uc2Btn.addEventListener('click', async () => {
    const normalizedTemplate = normalizeUC2Template(uc2Template.value);
    const templateMeta = getUC2TemplateMeta(normalizedTemplate);
    const primaryValue = uc2Company.value.trim();

    if (!primaryValue) return alert(templateMeta.emptyMessage);

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
      template: normalizedTemplate
    };

    if (templateMeta.payloadKey === 'modelName') {
      payload.modelName = primaryValue;
    } else {
      payload.companyName = primaryValue;
    }

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

      uc2CurrentPdfViewUrl = pdfViewUrl;
      uc2Frame.src = buildUC2EmbedUrl(pdfViewUrl);
      uc2Frame.style.display = 'block';

      requestAnimationFrame(() => fitUC2Viewer());
    } catch (error) {
      console.error('UC2 run error:', error);
      alert('제안서 생성 실패: ' + error.message);

      uc2Loading.style.display = 'none';
      uc2Placeholder.style.display = 'block';
    } finally {
      uc2Btn.disabled = false;
      uc2Btn.textContent = '▶ 초안 생성';
    }
  });

  // ==========================================
  // 🎙️ Use Case 3: Voice Agent
  // ✅ 동작 로직 유지
  // ==========================================
  const uc3Start = document.getElementById('uc3-startBtn');
  const uc3End = document.getElementById('uc3-endBtn');
  const uc3StatusText = document.getElementById('uc3-statusText');
  const uc3Loading = document.getElementById('uc3-loading');
  const uc3LogArea = document.getElementById('uc3-logArea');
  const uc3LogContent = document.getElementById('uc3-logContent');
  const uc3Visualizer = document.getElementById('uc3-visualizer');
  const uc3Script = document.getElementById('uc3-scriptContent');
  const uc3Page = document.getElementById('uc3-pageIndicator');
  const uc3Prev = document.getElementById('uc3-prevBtn');
  const uc3Next = document.getElementById('uc3-nextBtn');

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

  let currentPage = 0;
  let currentCallId = null;
  let isUC3Ending = false;
  let uc3SessionSeq = 0;
  let activeUc3SessionSeq = 0;

  function renderScript() {
    const rawLines = scripts[currentPage].split('\n');
    const htmlLines = rawLines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="script-spacer"></div>';

      if (trimmed.startsWith('[')) {
        return `<div class="context-line"><span class="context-text">${escapeHtml(trimmed)}</span></div>`;
      }

      if (trimmed.startsWith('Agent:')) {
        const text = mergedLineText(trimmed, 'Agent:');
        return `
          <div class="agent-line">
            <span class="speaker-badge agent-badge">Agent</span>
            <span class="agent-text">${escapeHtml(text)}</span>
          </div>`;
      }

      if (trimmed.startsWith('User:')) {
        const text = mergedLineText(trimmed, 'User:');
        return `
          <div class="user-line">
            <span class="speaker-badge user-badge">User</span>
            <span class="user-text">${escapeHtml(text)}</span>
          </div>`;
      }

      return `<div class="script-line script-free">${escapeHtml(trimmed)}</div>`;
    });

    uc3Script.innerHTML = htmlLines.join('');
    uc3Page.innerText = `${currentPage + 1} / ${scripts.length}`;
  }

  function mergedLineText(line, prefix) {
    return line.slice(prefix.length).trim();
  }

  renderScript();
  uc3Prev.addEventListener('click', () => {
    currentPage = (currentPage - 1 + scripts.length) % scripts.length;
    renderScript();
  });
  uc3Next.addEventListener('click', () => {
    currentPage = (currentPage + 1) % scripts.length;
    renderScript();
  });

  function clearUC3LogView() {
    uc3LogArea.style.display = 'none';
    uc3LogContent.innerHTML = '';
  }

  function resetUC3ToIdle(buttonText = '📞 통화 시작') {
    uc3Start.disabled = false;
    uc3Start.innerText = buttonText;
    uc3Start.style.display = 'flex';
    uc3End.style.display = 'none';
    uc3Visualizer.style.display = 'none';
    uc3Loading.style.display = 'none';
  }

  async function safeLeaveCurrentSession() {
    if (!window.uvSession) return;

    try {
      await window.uvSession.leaveCall();
    } catch (leaveError) {
      console.warn('leaveCall warning:', leaveError);
    } finally {
      window.uvSession = null;
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createCallLogCard(data) {
    function escapeHtml(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const summary = data?.summary ?? '요약이 제공되지 않았습니다.';
    const status = data?.status ?? 'unknown';
    const conversation = Array.isArray(data?.conversation) ? data.conversation : (
      Array.isArray(data?.log) ? data.log : []
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

  // ==========================================
  // 🧠 Use Case 4: Text-to-SQL
  // ==========================================
  const UC4_SCENARIOS = {
    '1': {
      id: '1',
      type: 'monthly_aggregate',
      sessionSummary: '박 지우 · 영업1팀 · Owner Workspace · mart_owner_scorecard_monthly',
      question: '이번 달 나의 전체 영업기회 수주율(Win Rate)과 평균 수주 소요 기간(Sales Cycle)은 어떻게 돼? 지난달 데이터와 비교해서 내가 개선되고 있는지 분석해줘.',
      session_context: {
        timezone: 'Asia/Seoul',
        current_date: '2026-04-14',
        record_page_object: null,
        record_id: null,
        account_id: null,
        opportunity_id: null,
        owner_id: '005TJ000003inheYAA'
      },
      candidate_models: ['analytics_mart_dbt.mart_owner_scorecard_monthly'],
      variants: [
        { id: '1-base', label: '전월 대비 성과 진단', question: '이번 달 나의 전체 영업기회 수주율(Win Rate)과 평균 수주 소요 기간(Sales Cycle)은 어떻게 돼? 지난달 데이터와 비교해서 내가 개선되고 있는지 분석해줘.' },
        { id: '1-summary', label: '핵심 지표 요약', question: '이번 달 나의 영업 수주율(Win Rate)과 딜 하나를 수주하는 데 걸리는 평균 시간(Sales Cycle)을 알려줘.' },
        { id: '1-improvement', label: '실적 개선 여부 분석', question: '수주 소요 기간과 수주율을 기준으로 볼 때, 내 영업 퍼포먼스가 지난달보다 얼마나 나아졌는지 수치로 비교해줘.' }
      ]
    },
    '2': {
      id: '2',
      type: 'account_view_aggregate',
      sessionSummary: '박 지우 · Account Record Page · 지에스건설 주식회사 · mart_account_360_current',
      question: '이 고객사의 누적 수주 금액(Won Amount)과 현재 진행 중인 파이프라인 금액 비율을 알려주고, 가장 최근에 영업기회가 업데이트된 날짜가 언제인지 요약해 브리핑해줘.',
      session_context: {
        timezone: 'Asia/Seoul',
        current_date: '2026-04-14',
        record_page_object: 'Account',
        record_id: '001TJ00000De275YAB',
        account_id: '001TJ00000De275YAB',
        opportunity_id: null,
        owner_id: '005TJ000003inheYAA'
      },
      candidate_models: ['analytics_mart_dbt.mart_account_360_current', 'analytics_mart_dbt.dim_account_current'],
      variants: [
        { id: '2-base', label: '고객사 요약 브리핑', question: '이 고객사의 누적 수주 금액(Won Amount)과 현재 진행 중인 파이프라인 금액 비율을 알려주고, 가장 최근에 영업기회가 업데이트된 날짜가 언제인지 요약해 브리핑해줘.' },
        { id: '2-ratio', label: '수주 비중 분석', question: '이 고객사와 진행 중인 전체 금액 중에서 이미 성공적으로 수주(Won)된 금액의 비율은 얼마나 돼?' },
        { id: '2-activity', label: '최근 액티비티 체크', question: '해당 고객사의 총 수주 금액 규모와 현재 열려있는 파이프라인 금액을 비교해주고, 이 고객사 건으로 가장 마지막에 액션이 일어난 시점이 언제인지 확인해줘.' }
      ]
    },
    '3': {
      id: '3',
      type: 'snapshot_time_series_comparison',
      sessionSummary: '박 지우 · Snapshot Time-travel · 최근 한 달 Open Pipeline 증감 비교',
      question: '최근 한 달 새 내가 진행 중인(Open) 파이프라인 총 금액이 첫 스냅샷 때보다 얼마나 늘었어?',
      session_context: {
        timezone: 'Asia/Seoul',
        current_date: '2026-04-14',
        record_page_object: null,
        record_id: null,
        account_id: null,
        opportunity_id: null,
        owner_id: '005TJ000003inheYAA'
      },
      candidate_models: ['analytics_mart_dbt.fct_opportunity_snapshot_daily'],
      variants: [
        { id: '3-base', label: '파이프라인 증감액', question: '최근 한 달 새 내가 진행 중인(Open) 파이프라인 총 금액이 첫 스냅샷 때보다 얼마나 늘었어?' },
        { id: '3-change', label: '진행 중 딜 규모 변화', question: '한 달 전 데이터와 비교해서, 지금 활성화되어 있는 영업기회들의 파이프라인 총액이 얼마나 증가했는지 계산해줘.' },
        { id: '3-momentum', label: '과거 대비 모멘텀', question: '가장 오래된 스냅샷 날짜 기준으로 현재 나의 오픈 파이프라인 금액(Amount) 총합은 얼마나 큰 폭으로 성장했어?' }
      ]
    },
    '4': {
      id: '4',
      type: 'specific_opportunity_diagnosis',
      sessionSummary: '박 지우 · Opportunity Record Page · 더샵포레나 키친 패키지 납품',
      question: '현재 보고 있는 이 영업기회의 리스크 총점(opportunity_risk_total_score)은 몇 점이고, 기록된 주요 수주/실패 요인(win_reason, loss_reason)은 무엇인지 확인해서 현재 상태를 요약해줘.',
      session_context: {
        timezone: 'Asia/Seoul',
        current_date: '2026-04-14',
        record_page_object: 'Opportunity',
        record_id: '006JO00000BpGR3YAN',
        account_id: '001TJ00000De275YAB',
        opportunity_id: '006JO00000BpGR3YAN',
        owner_id: '005TJ000003inheYAA'
      },
      candidate_models: ['analytics_mart_dbt.obt_opportunity_search'],
      variants: [
        { id: '4-base', label: '영업기회 리스크 진단', question: '현재 보고 있는 이 영업기회의 리스크 총점(opportunity_risk_total_score)은 몇 점이고, 기록된 주요 수주/실패 요인(win_reason, loss_reason)은 무엇인지 확인해서 현재 상태를 요약해줘.' },
        { id: '4-health', label: '딜 건전성 체크', question: '이 딜의 리스크 점수(Risk Score)를 확인해주고, 만약 수주나 실패 요인이 이미 기록되어 있다면 어떤 내용인지 함께 브리핑해줘.' },
        { id: '4-consult', label: 'AI 딜 컨설팅', question: '해당 영업기회의 수주 가능성을 진단하기 위해 리스크 총점과 수주/실패 요인(win/loss reason) 정보를 추출해줘.' }
      ]
    },
    '5': {
      id: '5',
      type: 'stage_bottleneck_trend',
      sessionSummary: '영업 본부장 관점 · Pipeline Trend Dashboard · mart_stage_trend_monthly',
      question: '최근 3개월 동안 영업 단계(Stage)별로 파이프라인 금액(Open Pipeline) 추이가 어떻게 변하고 있어? 특히 어느 단계에서 딜이 정체되고 있는지 트렌드를 시사해줘.',
      session_context: {
        timezone: 'Asia/Seoul',
        current_date: '2026-04-14',
        record_page_object: null,
        record_id: null,
        account_id: null,
        opportunity_id: null,
        owner_id: '005TJ000003inheYAA'
      },
      candidate_models: ['analytics_mart_dbt.mart_stage_trend_monthly'],
      variants: [
        { id: '5-base', label: '스테이지별 정체 분석', question: '최근 3개월 동안 영업 단계(Stage)별로 파이프라인 금액(Open Pipeline) 추이가 어떻게 변하고 있어? 특히 어느 단계에서 딜이 정체되고 있는지 트렌드를 시사해줘.' },
        { id: '5-bottleneck', label: '병목 구간 탐지', question: '지난 3개월간 어느 영업 단계(Stage)에 파이프라인 금액이 가장 많이 몰려있어? 자금이 묶여 있는 병목 구간을 분석해줘.' },
        { id: '5-flow', label: '월별 파이프라인 흐름', question: '최근 3개월 기준 영업 단계별(Stage) 파이프라인 총액 변화를 보여주고, 제안이나 협상 단계에서 지연되는 딜이 있는지 알려줘.' }
      ]
    }
  };

  const uc4ScenarioGrid = document.getElementById('uc4-scenarioGrid');
  const uc4ScenarioCards = document.querySelectorAll('.uc4-scenario-card');
  const uc4ContextDetails = document.querySelectorAll('.uc4-context-details');
  const uc4VariantStrip = document.getElementById('uc4-variantStrip');
  const uc4QuestionInput = document.getElementById('uc4-questionInput');
  const uc4RunBtn = document.getElementById('uc4-runBtn');
  const uc4ResultPanels = document.getElementById('uc4-resultPanels');

  let uc4SelectedScenarioId = null;
  let uc4SelectedVariantId = null;
  let uc4AbortController = null;
  let uc4PendingRequestId = null;

  function uc4EscapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uc4ShortModelName(model) {
    const raw = String(model ?? '').trim();
    if (!raw) return '-';
    const parts = raw.split('.');
    return parts[parts.length - 1] || raw;
  }

  function uc4SafeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function uc4FormatNumber(value, { maximumFractionDigits = 0 } = {}) {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value ?? 'null');
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(num);
  }

  function uc4FormatPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value ?? 'null');
    return `${(num * 100).toFixed(2)}%`;
  }

  function uc4FormatCurrencyCompact(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value ?? 'null');
    if (Math.abs(num) >= 100000000) {
      return `${(num / 100000000).toFixed(2)}억`;
    }
    return `${uc4FormatNumber(num)}원`;
  }

  function uc4FormatDate(value) {
    if (!value) return 'null';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul'
    }).format(date);
  }

  function uc4FormatCell(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'number') return uc4FormatNumber(value, { maximumFractionDigits: 6 });
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return uc4FormatDate(value);
    return String(value);
  }

  function uc4CreateRequestId() {
    if (window.crypto?.randomUUID) {
      return `uc4_${window.crypto.randomUUID()}`;
    }
    return `uc4_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function uc4GetSelectedScenario() {
    return uc4SelectedScenarioId ? UC4_SCENARIOS[uc4SelectedScenarioId] : null;
  }

  function uc4FindMatchingVariant(scenario, question) {
    if (!scenario) return null;
    const normalized = String(question ?? '').trim();
    return scenario.variants.find((variant) => variant.question.trim() === normalized) ?? null;
  }

  function uc4UpdateRunButtonState() {
    const hasScenario = Boolean(uc4SelectedScenarioId);
    const hasQuestion = String(uc4QuestionInput?.value ?? '').trim().length > 0;
    uc4RunBtn.disabled = !(hasScenario && hasQuestion);
  }

  function uc4RenderVariantStrip(scenario) {
    if (!uc4VariantStrip) return;

    if (!scenario) {
      uc4VariantStrip.innerHTML = '<span class="uc4-variant-empty">상단 질문 세트를 선택하면 변주 질문이 표시됩니다.</span>';
      return;
    }

    uc4VariantStrip.innerHTML = scenario.variants.map((variant) => {
      const activeClass = variant.id === uc4SelectedVariantId ? ' is-active' : '';
      return `<button type="button" class="uc4-variant-chip${activeClass}" data-variant-id="${uc4EscapeHtml(variant.id)}">${uc4EscapeHtml(variant.label)}</button>`;
    }).join('');

    uc4VariantStrip.querySelectorAll('.uc4-variant-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const variantId = chip.dataset.variantId;
        const selectedVariant = scenario.variants.find((variant) => variant.id === variantId);
        if (!selectedVariant) return;

        uc4SelectedVariantId = selectedVariant.id;
        uc4QuestionInput.value = selectedVariant.question;
        uc4RenderVariantStrip(scenario);
        uc4UpdateRunButtonState();
        uc4QuestionInput.focus();
      });
    });
  }

  function uc4ActivateContext(scenarioId) {
    uc4ContextDetails.forEach((details) => {
      const isTarget = details.dataset.scenario === scenarioId;
      details.classList.toggle('is-active', isTarget);
      if (isTarget) {
        details.setAttribute('open', '');
      } else {
        details.removeAttribute('open');
      }
    });
  }

  function uc4ActivateScenarioCard(scenarioId) {
    uc4ScenarioCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.scenario === scenarioId);
    });
  }

  function uc4SelectScenario(scenarioId, { populateQuestion = true, preferredVariantId = null } = {}) {
    const scenario = UC4_SCENARIOS[scenarioId];
    if (!scenario) return;

    uc4SelectedScenarioId = scenarioId;
    uc4ActivateScenarioCard(scenarioId);
    uc4ActivateContext(scenarioId);

    const defaultVariant = scenario.variants.find((variant) => variant.id === preferredVariantId) || scenario.variants[0];
    uc4SelectedVariantId = defaultVariant?.id ?? null;

    if (populateQuestion && defaultVariant) {
      uc4QuestionInput.value = defaultVariant.question;
    }

    uc4RenderVariantStrip(scenario);
    uc4UpdateRunButtonState();
  }

  function uc4RenderEmptyState(message = '상단 질문 세트를 선택하면 세션 컨텍스트와 질문이 준비됩니다.') {
    uc4ResultPanels.innerHTML = `
      <div class="uc4-result-panel uc4-result-empty is-active">
        <div class="uc4-empty-state">
          <div class="uc4-empty-icon">🧠</div>
          <h3>Text-to-SQL 시연 준비 완료</h3>
          <p>${uc4EscapeHtml(message)}</p>
        </div>
      </div>
    `;
  }

  function uc4RenderLoadingState(question) {
    uc4ResultPanels.innerHTML = `
      <div class="uc4-result-panel is-active">
        <div class="uc4-loading-state">
          <div class="uc4-loading-spinner"></div>
          <h3>SQL 실행 및 AI 브리핑 생성 중</h3>
          <p>${uc4EscapeHtml(question)}</p>
        </div>
      </div>
    `;
  }

  function uc4BuildRowsPreviewTable(rows) {
    const safeRows = uc4SafeArray(rows);
    if (!safeRows.length) return '';

    const columns = [...new Set(safeRows.flatMap((row) => Object.keys(row ?? {})))].slice(0, 8);
    if (!columns.length) return '';

    const thead = columns.map((col) => `<th>${uc4EscapeHtml(col)}</th>`).join('');
    const tbody = safeRows.slice(0, 10).map((row) => {
      const cells = columns.map((col) => `<td>${uc4EscapeHtml(uc4FormatCell(row?.[col]))}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <details class="uc4-details" open>
        <summary>Rows Preview</summary>
        <div class="uc4-table-wrap">
          <table class="uc4-result-table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
      </details>
    `;
  }

  function uc4BuildKpiCards(response) {
    const rows = uc4SafeArray(response?.sql_result?.rows_preview);
    const scenario = uc4GetSelectedScenario();
    const first = rows[0] ?? {};

    const cards = [];

    if (scenario?.id === '1') {
      cards.push(
        { label: 'Win Rate', value: uc4FormatPercent(first.win_rate), note: first.snapshot_month ? String(first.snapshot_month).slice(0, 10) : 'current' },
        { label: 'Sales Cycle', value: Number.isFinite(Number(first.avg_sales_cycle_days_won)) ? `${uc4FormatNumber(first.avg_sales_cycle_days_won)}일` : 'null', note: 'avg_sales_cycle_days_won' },
        { label: '담당자', value: first.owner_name ?? '-', note: first.owner_department ?? '-' },
        { label: 'Rows', value: uc4FormatNumber(response?.sql_result?.row_count ?? 0), note: 'result rows' }
      );
    } else if (scenario?.id === '2') {
      cards.push(
        { label: 'Won Amount', value: uc4FormatCurrencyCompact(first.won_amount), note: 'won_amount' },
        { label: 'Open Pipeline', value: uc4FormatCurrencyCompact(first.open_pipeline_amount), note: 'open_pipeline_amount' },
        { label: 'Won / Pipeline', value: first.won_to_pipeline_ratio != null ? Number(first.won_to_pipeline_ratio).toFixed(6) : 'null', note: 'ratio' },
        { label: '최근 업데이트', value: first.latest_opportunity_system_modstamp_at ? uc4FormatDate(first.latest_opportunity_system_modstamp_at) : '-', note: 'system_modstamp' }
      );
    } else if (scenario?.id === '3') {
      cards.push(
        { label: 'First Snapshot', value: uc4FormatCurrencyCompact(first.first_snapshot_open_pipeline_amount), note: 'start' },
        { label: 'Latest Snapshot', value: uc4FormatCurrencyCompact(first.latest_snapshot_open_pipeline_amount), note: 'latest' },
        { label: 'Increase', value: uc4FormatCurrencyCompact(first.increase_amount), note: 'delta' },
        { label: 'Rows', value: uc4FormatNumber(response?.sql_result?.row_count ?? 0), note: 'aggregate row' }
      );
    } else if (scenario?.id === '4') {
      cards.push(
        { label: 'Risk Score', value: first.opportunity_risk_total_score ?? 'null', note: 'opportunity_risk_total_score' },
        { label: 'Stage', value: first.stage_name ?? '-', note: 'stage_name' },
        { label: 'Forecast', value: first.forecast_category_name ?? '-', note: 'forecast_category_name' },
        { label: 'Amount', value: uc4FormatCurrencyCompact(first.amount), note: first.close_date ? uc4FormatDate(first.close_date) : 'close_date' }
      );
    } else if (scenario?.id === '5') {
      const topRows = rows
        .filter((row) => Number(row?.open_pipeline_amount) > 0)
        .sort((a, b) => Number(b.open_pipeline_amount) - Number(a.open_pipeline_amount));
      const top1 = topRows[0] ?? {};
      const top2 = topRows[1] ?? {};
      const top3 = topRows[2] ?? {};
      cards.push(
        { label: 'Top Bottleneck', value: top1.stage_name ?? '-', note: uc4FormatCurrencyCompact(top1.open_pipeline_amount) },
        { label: '2nd Stage', value: top2.stage_name ?? '-', note: uc4FormatCurrencyCompact(top2.open_pipeline_amount) },
        { label: '3rd Stage', value: top3.stage_name ?? '-', note: uc4FormatCurrencyCompact(top3.open_pipeline_amount) },
        { label: 'Rows', value: uc4FormatNumber(response?.sql_result?.row_count ?? 0), note: 'trend rows' }
      );
    } else {
      cards.push(
        { label: 'Status', value: response?.status ?? '-', note: response?.question_shape ?? 'unknown' },
        { label: 'Rows', value: uc4FormatNumber(response?.sql_result?.row_count ?? 0), note: 'row_count' },
        { label: 'Model', value: uc4ShortModelName(response?.selected_model), note: 'selected_model' },
        { label: 'Retry', value: uc4FormatNumber(response?.diagnostics?.retry_count ?? 0), note: 'retry_count' }
      );
    }

    return `
      <div class="uc4-kpi-band">
        ${cards.slice(0, 4).map((card) => `
          <div class="uc4-kpi-card">
            <span class="uc4-kpi-label">${uc4EscapeHtml(card.label)}</span>
            <strong class="uc4-kpi-value">${uc4EscapeHtml(card.value)}</strong>
            <span class="uc4-kpi-note">${uc4EscapeHtml(card.note)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function uc4BuildDiagnosticsCard(response) {
    const diagnostics = response?.diagnostics ?? {};
    return `
      <div class="uc4-result-card">
        <div class="uc4-result-title">Execution Summary</div>
        <div class="uc4-diag-list">
          <div class="uc4-diag-item">
            <span>message</span>
            <strong>${uc4EscapeHtml(diagnostics.message ?? '-')}</strong>
          </div>
          ${diagnostics.likely_cause ? `
          <div class="uc4-diag-item">
            <span>likely_cause</span>
            <p>${uc4EscapeHtml(diagnostics.likely_cause)}</p>
          </div>` : ''}
          ${diagnostics.suggested_next_action ? `
          <div class="uc4-diag-item">
            <span>suggested_next_action</span>
            <p>${uc4EscapeHtml(diagnostics.suggested_next_action)}</p>
          </div>` : ''}
        </div>
      </div>
    `;
  }

  function uc4BuildRawJsonDetails(response) {
    return `
      <details class="uc4-details">
        <summary>Raw Response JSON</summary>
        <pre class="uc4-code-block">${uc4EscapeHtml(JSON.stringify(response, null, 2))}</pre>
      </details>
    `;
  }

  function uc4BuildSqlDetails(response) {
    const sql = response?.sql_result?.sql;
    if (!sql) return '';
    return `
      <details class="uc4-details">
        <summary>Generated SQL Trace</summary>
        <pre class="uc4-code-block">${uc4EscapeHtml(sql)}</pre>
      </details>
    `;
  }

  function uc4RenderResponse(response) {
    const diagnostics = response?.diagnostics ?? {};
    const status = String(response?.status ?? 'UNKNOWN').toUpperCase();
    const badgeClass = status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'info';
    const metaBadges = [
      response?.question_shape ? `question_shape · ${response.question_shape}` : null,
      response?.sql_result?.row_count != null ? `row_count · ${response.sql_result.row_count}` : null,
      response?.selected_model ? `selected_model · ${uc4ShortModelName(response.selected_model)}` : null,
      diagnostics?.auto_retry_count ? `auto_retry_count · ${diagnostics.auto_retry_count}` : null,
      response?.request_id ? `request_id · ${response.request_id}` : null,
    ].filter(Boolean);

    const briefing = response?.ai_briefing || (status === 'SUCCESS'
      ? 'AI 브리핑이 아직 비어 있습니다. diagnostics.message와 rows preview를 함께 확인하세요.'
      : response?.diagnostics?.suggested_next_action || response?.diagnostics?.message || '실패 원인과 다음 조치를 확인하세요.');

    uc4ResultPanels.innerHTML = `
      <div class="uc4-result-panel is-active">
        <div class="uc4-runtime-grid">
          <div class="uc4-response-topline">
            <span class="status-badge ${badgeClass}">${uc4EscapeHtml(status)}</span>
            ${metaBadges.map((badge) => `<span class="uc4-inline-meta">${uc4EscapeHtml(badge)}</span>`).join('')}
          </div>

          <div class="uc4-result-card uc4-answer-card">
            <div class="uc4-result-title">AI 브리핑</div>
            <div class="uc4-result-text">${uc4EscapeHtml(briefing)}</div>
          </div>

          ${uc4BuildKpiCards(response)}
          ${uc4BuildDiagnosticsCard(response)}
          ${uc4BuildRowsPreviewTable(response?.sql_result?.rows_preview)}
          ${uc4BuildSqlDetails(response)}
          ${uc4BuildRawJsonDetails(response)}
        </div>
      </div>
    `;
  }

  function uc4RenderErrorState(title, message) {
    uc4ResultPanels.innerHTML = `
      <div class="uc4-result-panel is-active">
        <div class="uc4-error-state">
          <div class="uc4-error-icon">⚠️</div>
          <h3>${uc4EscapeHtml(title)}</h3>
          <p>${uc4EscapeHtml(message)}</p>
        </div>
      </div>
    `;
  }

  async function uc4RunQuery() {
    const scenario = uc4GetSelectedScenario();
    const question = String(uc4QuestionInput.value ?? '').trim();

    if (!scenario) {
      uc4RenderErrorState('질문 세트를 먼저 선택하세요.', '상단 카드에서 시연할 질문 세트를 선택해야 세션 컨텍스트가 고정됩니다.');
      return;
    }

    if (!question) {
      uc4RenderErrorState('질문이 비어 있습니다.', '자연어 질문을 입력하거나 상단 변주 질문을 선택한 뒤 다시 실행하세요.');
      return;
    }

    const requestId = uc4CreateRequestId();
    uc4PendingRequestId = requestId;

    if (uc4AbortController) {
      try {
        uc4AbortController.abort();
      } catch (_) { }
    }

    uc4AbortController = new AbortController();

    const payload = {
      request_id: requestId,
      question,
      session_context: scenario.session_context,
      candidate_models: scenario.candidate_models,
      client_context: {
        source: 'webapp',
        use_case: 'text_to_sql',
        selected_set_id: `scenario_${scenario.id}`,
        selected_variant_id: uc4SelectedVariantId,
        scenario_type: scenario.type,
        app_version: APP_VERSION,
        sent_at: new Date().toISOString()
      }
    };

    uc4RunBtn.disabled = true;
    uc4RunBtn.classList.add('uc4-run-pulse');
    uc4RenderLoadingState(question);

    try {
      const res = await fetch(CONFIG.UC4_WEBHOOK, {
        method: 'POST',
        cache: 'no-store',
        signal: uc4AbortController.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`서버 에러 (${res.status})`);
      }

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('UC4 JSON parse error:', parseError, rawText);
        throw new Error('Text-to-SQL 응답(JSON) 파싱 실패');
      }

      if (uc4PendingRequestId !== requestId) return;

      if (data.request_id && data.request_id !== requestId) {
        console.warn('UC4 request_id mismatch:', { expected: requestId, received: data.request_id });
      }

      uc4RenderResponse(data);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('UC4 webhook error:', error);
      uc4RenderErrorState('Text-to-SQL 실행 실패', error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      if (uc4PendingRequestId === requestId) {
        uc4RunBtn.disabled = false;
      }
      setTimeout(() => uc4RunBtn.classList.remove('uc4-run-pulse'), 800);
    }
  }

  if (uc4ScenarioGrid && uc4QuestionInput && uc4RunBtn && uc4ResultPanels) {
    uc4RenderVariantStrip(null);
    uc4RenderEmptyState();
    uc4QuestionInput.value = '';
    uc4UpdateRunButtonState();

    uc4ScenarioCards.forEach((card) => {
      card.addEventListener('click', () => {
        uc4SelectScenario(card.dataset.scenario, { populateQuestion: true });
      });
    });

    uc4QuestionInput.addEventListener('input', () => {
      const scenario = uc4GetSelectedScenario();
      const matchingVariant = uc4FindMatchingVariant(scenario, uc4QuestionInput.value);
      uc4SelectedVariantId = matchingVariant?.id ?? null;
      uc4RenderVariantStrip(scenario);
      uc4UpdateRunButtonState();
    });

    uc4RunBtn.addEventListener('click', uc4RunQuery);
  }

});