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
const APP_VERSION = 'app.final.uc2-template-router 2026-04-06-v1';
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
    const normalizedTemplate = normalizeUC2Template(templateId);
    return UC2_TEMPLATE_META[normalizedTemplate] || UC2_TEMPLATE_META.hvac_template2;
  }

  function syncUC2InputByTemplate({ preserveValue = false } = {}) {
    const templateId = normalizeUC2Template(uc2Template.value);
    const meta = getUC2TemplateMeta(templateId);

    if (uc2PrimaryLabel) {
      uc2PrimaryLabel.textContent = meta.label;
    }

    if (uc2Company) {
      if (!preserveValue && uc2LastTemplateId && uc2LastTemplateId !== templateId) {
        uc2Company.value = '';
      }
      uc2Company.placeholder = meta.placeholder;
      uc2Company.setAttribute('aria-label', meta.label);
    }

    if (uc2InputHint) {
      uc2InputHint.textContent = meta.hint;
    }

    uc2LastTemplateId = templateId;
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

  // ==========================================
  // 🧠 Use Case 4: Text-to-SQL Scenario UI
  // ✅ 기존 UC1~UC3 로직 유지 + UC4 인터랙션만 추가
  // ==========================================
  const uc4ScenarioCards = Array.from(document.querySelectorAll('.uc4-scenario-card'));
  const uc4ContextPanels = Array.from(document.querySelectorAll('.uc4-context-details'));
  const uc4ResultPanels = Array.from(document.querySelectorAll('.uc4-result-panel'));
  const uc4VariantStrip = document.getElementById('uc4-variantStrip');
  const uc4QuestionInput = document.getElementById('uc4-questionInput');
  const uc4RunBtn = document.getElementById('uc4-runBtn');
  const uc4ResultPanelsWrap = document.getElementById('uc4-resultPanels');

  if (uc4ScenarioCards.length && uc4QuestionInput && uc4VariantStrip) {
    const UC4_SCENARIOS = {
      '1': {
        question: '이번 달 나의 전체 영업기회 수주율(Win Rate)과 평균 수주 소요 기간(Sales Cycle)은 어떻게 돼? 지난달 데이터와 비교해서 내가 개선되고 있는지 분석해줘.',
        variants: [
          {
            label: '전월 대비 성과 진단',
            text: '이번 달 나의 전체 영업기회 수주율(Win Rate)과 평균 수주 소요 기간(Sales Cycle)은 어떻게 돼? 지난달 데이터와 비교해서 내가 개선되고 있는지 분석해줘.'
          },
          {
            label: '핵심 지표 요약',
            text: '이번 달 나의 영업 수주율(Win Rate)과 딜 하나를 수주하는 데 걸리는 평균 시간(Sales Cycle)을 알려줘.'
          },
          {
            label: '실적 개선 여부 분석',
            text: '수주 소요 기간과 수주율을 기준으로 볼 때, 내 영업 퍼포먼스가 지난달보다 얼마나 나아졌는지 수치로 비교해줘.'
          }
        ]
      },
      '2': {
        question: '이 고객사의 누적 수주 금액(Won Amount)과 현재 진행 중인 파이프라인 금액 비율을 알려주고, 가장 최근에 영업기회가 업데이트된 날짜가 언제인지 요약해 브리핑해줘.',
        variants: [
          {
            label: '고객사 요약 브리핑',
            text: '이 고객사의 누적 수주 금액(Won Amount)과 현재 진행 중인 파이프라인 금액 비율을 알려주고, 가장 최근에 영업기회가 업데이트된 날짜가 언제인지 요약해 브리핑해줘.'
          },
          {
            label: '수주 비중 분석',
            text: '이 고객사와 진행 중인 전체 금액 중에서 이미 성공적으로 수주(Won)된 금액의 비율은 얼마나 돼?'
          },
          {
            label: '최근 액티비티 체크',
            text: '해당 고객사의 총 수주 금액 규모와 현재 열려있는 파이프라인 금액을 비교해주고, 이 고객사 건으로 가장 마지막에 액션이 일어난 시점이 언제인지 확인해줘.'
          }
        ]
      },
      '3': {
        question: '최근 한 달 새 내가 진행 중인(Open) 파이프라인 총 금액이 첫 스냅샷 때보다 얼마나 늘었어?',
        variants: [
          {
            label: '파이프라인 증감액',
            text: '최근 한 달 새 내가 진행 중인(Open) 파이프라인 총 금액이 첫 스냅샷 때보다 얼마나 늘었어?'
          },
          {
            label: '진행 중 딜 규모 변화',
            text: '한 달 전 데이터와 비교해서, 지금 활성화되어 있는 영업기회들의 파이프라인 총액이 얼마나 증가했는지 계산해줘.'
          },
          {
            label: '과거 대비 모멘텀',
            text: '가장 오래된 스냅샷 날짜 기준으로 현재 나의 오픈 파이프라인 금액(Amount) 총합은 얼마나 큰 폭으로 성장했어?'
          }
        ]
      },
      '4': {
        question: '현재 보고 있는 이 영업기회의 리스크 총점(opportunity_risk_total_score)은 몇 점이고, 기록된 주요 수주/실패 요인(win_reason, loss_reason)은 무엇인지 확인해서 현재 상태를 요약해줘.',
        variants: [
          {
            label: '영업기회 리스크 진단',
            text: '현재 보고 있는 이 영업기회의 리스크 총점(opportunity_risk_total_score)은 몇 점이고, 기록된 주요 수주/실패 요인(win_reason, loss_reason)은 무엇인지 확인해서 현재 상태를 요약해줘.'
          },
          {
            label: '딜 건전성 체크',
            text: '이 딜의 리스크 점수(Risk Score)를 확인해주고, 만약 수주나 실패 요인이 이미 기록되어 있다면 어떤 내용인지 함께 브리핑해줘.'
          },
          {
            label: 'AI 딜 컨설팅',
            text: '해당 영업기회의 수주 가능성을 진단하기 위해 리스크 총점과 수주/실패 요인(win/loss reason) 정보를 추출해줘.'
          }
        ]
      },
      '5': {
        question: '최근 3개월 동안 영업 단계(Stage)별로 파이프라인 금액(Open Pipeline) 추이가 어떻게 변하고 있어? 특히 어느 단계에서 딜이 정체되고 있는지 트렌드를 시사해줘.',
        variants: [
          {
            label: '스테이지별 정체 분석',
            text: '최근 3개월 동안 영업 단계(Stage)별로 파이프라인 금액(Open Pipeline) 추이가 어떻게 변하고 있어? 특히 어느 단계에서 딜이 정체되고 있는지 트렌드를 시사해줘.'
          },
          {
            label: '병목 구간 탐지',
            text: '지난 3개월간 어느 영업 단계(Stage)에 파이프라인 금액이 가장 많이 몰려있어? 자금이 묶여 있는 병목 구간을 분석해줘.'
          },
          {
            label: '월별 파이프라인 흐름',
            text: '최근 3개월 기준 영업 단계별(Stage) 파이프라인 총액 변화를 보여주고, 제안이나 협상 단계에서 지연되는 딜이 있는지 알려줘.'
          }
        ]
      }
    };

    let uc4ActiveScenarioId = '1';
    let uc4ActiveVariantIndex = -1;

    function setUc4ActiveResult(scenarioId) {
      uc4ResultPanels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.scenario === scenarioId);
      });
    }

    function setUc4ActiveContext(scenarioId) {
      uc4ContextPanels.forEach((detailsEl) => {
        const isTarget = detailsEl.dataset.scenario === scenarioId;
        detailsEl.classList.toggle('is-active', isTarget);
        if (isTarget) {
          detailsEl.open = true;
        } else {
          detailsEl.open = false;
        }
      });
    }

    function renderUc4Variants(scenarioId) {
      const scenario = UC4_SCENARIOS[scenarioId];
      uc4VariantStrip.innerHTML = '';
      if (!scenario || !Array.isArray(scenario.variants)) return;

      scenario.variants.forEach((variant, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'uc4-variant-chip';
        if (index === uc4ActiveVariantIndex) btn.classList.add('is-active');

        btn.textContent = `[${variant.label}]`;

        btn.title = variant.text;
        btn.setAttribute('aria-label', `${variant.label}: ${variant.text}`);

        btn.addEventListener('click', () => {
          uc4ActiveVariantIndex = index;
          uc4QuestionInput.value = variant.text;
          renderUc4Variants(scenarioId);
        });

        uc4VariantStrip.appendChild(btn);
      });
    }

    function setUc4Scenario(scenarioId, options = {}) {
      const { preserveQuestion = false, preserveVariant = false } = options;
      const scenario = UC4_SCENARIOS[scenarioId];
      if (!scenario) return;

      uc4ActiveScenarioId = scenarioId;
      if (!preserveVariant) uc4ActiveVariantIndex = -1;

      uc4ScenarioCards.forEach((card) => {
        card.classList.toggle('is-active', card.dataset.scenario === scenarioId);
      });

      setUc4ActiveContext(scenarioId);
      setUc4ActiveResult(scenarioId);
      renderUc4Variants(scenarioId);

      if (!preserveQuestion) {
        uc4QuestionInput.value = scenario.question;
      }
    }

    uc4ScenarioCards.forEach((card) => {
      card.addEventListener('click', () => {
        const scenarioId = card.dataset.scenario;
        setUc4Scenario(scenarioId);
      });
    });

    uc4RunBtn?.addEventListener('click', () => {
      setUc4ActiveResult(uc4ActiveScenarioId);
      const activePanel = uc4ResultPanels.find((panel) => panel.dataset.scenario === uc4ActiveScenarioId);
      if (activePanel) {
        activePanel.classList.remove('uc4-run-pulse');
        void activePanel.offsetWidth;
        activePanel.classList.add('uc4-run-pulse');
        activePanel.scrollTop = 0;
      }
      uc4ResultPanelsWrap?.scrollTo?.({ top: 0, behavior: 'smooth' });
    });

    setUc4Scenario('1');
  }

  uc3End.addEventListener('click', async () => {
    await finalizeUC3Call({
      autoTriggered: false,
      sessionSeq: activeUc3SessionSeq,
      forceCallId: currentCallId
    });
  });
});