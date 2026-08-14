import { UltravoxSession } from 'https://esm.sh/ultravox-client@0.3.6';
import {
  UC6_BROWSER_ADMIN_ENDPOINTS,
  UC6_GENERIC_PUBLIC_ERROR_MESSAGE,
  classifyUc6AuthorizationFailure,
  createUc6BrowserAdminApi,
  mapUc6StateToView,
  normalizeUc6JobId,
  projectUc6DummyDatabagPackageFamilyOptions,
  projectUc6FreshTemplateOnboardingJobStatus,
  projectUc6FreshTemplateOnboardingSubmission,
  projectUc6FreshSyntheticGenerationSubmission,
  projectUc6FreshSyntheticScenarios,
  projectUc6FreshSyntheticScenarioBinding,
  projectUc6FreshSyntheticRenderJobStatus,
  projectUc6FreshSyntheticRenderSubmission,
  projectUc6FreshSyntheticRenderControl,
  projectUc6FreshRenderDeliveryControl,
  projectUc6DummyDatabagPackageOptions,
  projectUc6ReusableAssetCatalog,
  projectUc6ReusableAssetPackageOptions,
  projectUc6ReusableAssetRenderJobStatus,
  projectUc6ReusableAssetRenderSubmission,
  projectUc6PublishedAssetLinkedScenarioFamily,
  projectUc6PublishedAssetScenarioRenderJobStatus,
  projectUc6PublishedAssetScenarioRenderSubmission,
  projectUc6DummyDatabagRenderJobStatus,
  projectUc6DummyDatabagRenderSubmission,
  projectUc6FinalDeliveryCapabilities,
  projectUc6PersistedState,
  projectUc6ReviewIssuePresentation,
  projectUc6FreshReusableAssetPublication,
  projectUc6ReusableAssetPublication,
  runUc6CreateJobAndSubmitInitialAnalysis,
  splitDecisionTextLines,
  validateUc6DecisionCommand,
  validateUc6DummyDatabagRenderCommand,
  validateUc6SyntheticScenarioBindingCommand,
  validateUc6ReusableAssetPublicationCommand
} from './uc6-browser-admin.mjs';

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
  UC4_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/text-to-sql-webapp',
  UC5_W00_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-source-ingest-responses',
  UC5_W01_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-ai-narrative-plan-responses',
  UC5_W02_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-template-blueprint-plan-responses',
  UC5_W03_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-slot-fill-render-responses',
  UC5_W99_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-source-cleanup-responses',
  UC6_BROWSER_ADMIN_API_BASE: 'https://api.peter-n8n.duckdns.org'
};

// ==========================================
// 🏷️ 앱 버전 표시 (배포/캐시 확인용)
// ==========================================
const APP_VERSION = 'app.uc6-r6g-b2-linked-family-schema-alignment-2026-08-14-v1';
console.log(APP_VERSION);
console.info('[UC5 R3D] source ingestion + dynamic sharded W03 frontend orchestration active');

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

      url.searchParams.set('_', Date.now().toString());

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

      if (!res.ok) throw new Error(`상태 확인 실패 (${res.status})`);

      const rawText = await res.text();
      let data;
      try { data = JSON.parse(rawText); } catch (parseError) { throw new Error('상태 응답(JSON) 파싱 실패'); }

      const normalizedBatchId = sanitizeBatchId(data.split_batch_id) || sanitizeBatchId(data.batch_id) || safeBatchId;

      if (data.status === 'processing') {
        const serverMessage = data.message ? `\n${data.message}` : '';
        uc1StatusMsg.innerText = `현재 파이썬 워커가 데이터를 추출 중입니다...\n(Batch ID: ${normalizedBatchId || '확인 중'})${serverMessage}`;
        scheduleUC1Polling({ batchId: normalizedBatchId || safeBatchId, statusUrl: uc1CurrentStatusUrl });
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

      if (data.status === 'error') throw new Error(data.message || '파이썬 처리 중 에러가 발생했습니다.');

      throw new Error('알 수 없는 처리 결과입니다.');
    } catch (error) {
      if (error.name === 'AbortError') return;
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
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });

      if (!res.ok) throw new Error(`서버 에러 (${res.status})`);

      const data = await res.json();
      const statusUrl = sanitizeStatusUrl(data.check_status_url);
      const splitBatchId = sanitizeBatchId(data.split_batch_id);
      const batchId = splitBatchId || sanitizeBatchId(data.batch_id) || extractBatchIdFromStatusUrl(statusUrl);

      if (!statusUrl && !batchId) throw new Error('업로드 응답에서 batch_id/check_status_url을 받지 못했습니다.');

      uc1CurrentBatchId = batchId || null;
      uc1CurrentStatusUrl = statusUrl || CONFIG.UC1_STATUS_WEBHOOK;
      uc1StatusMsg.innerText = `현재 파이썬 워커가 데이터를 추출 중입니다...\n(Batch ID: ${uc1CurrentBatchId || '확인 중'})`;

      checkStatus({ batchId: uc1CurrentBatchId, statusUrl: uc1CurrentStatusUrl });
    } catch (error) {
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
    const availableHeight = Math.max(minHeight, window.innerHeight - rect.top - bottomGap);
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
      standard: 'hvac_template2', premium: 'hvac_template2', '표준 템플릿': 'hvac_template2',
      '기업 제안서': 'hvac_template2', hvac_template: 'hvac_template2', hvac_template2: 'hvac_template2',
      built_in_commercial: 'built_in_commercial', builtin_commercial: 'built_in_commercial',
      'built-in-commercial': 'built_in_commercial', '제품 제안서': 'built_in_commercial', 'Built-in-Commercial.pptx': 'built_in_commercial'
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
    if (!preserveValue || normalizedTemplate !== uc2LastTemplateId) uc2Company.value = '';
    uc2LastTemplateId = normalizedTemplate;
  }

  function pickFirstValidUrl(candidates) {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) return candidate.trim();
    }
    return '';
  }

  function isLikelyPdfUrl(url) { return typeof url === 'string' && /\.pdf(?:$|[?#])/i.test(url); }

  function pickFirstPdfUrl(candidates) {
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (!/^https?:\/\//i.test(trimmed)) continue;
      if (isLikelyPdfUrl(trimmed) || trimmed.includes('/file/') || trimmed.includes('/files/')) return trimmed;
    }
    return '';
  }

  function buildUC2DownloadUrl(pdfViewUrl) {
    if (!pdfViewUrl) return '';
    try {
      const url = new URL(pdfViewUrl);
      if (url.pathname.endsWith('/view')) { url.pathname = url.pathname.replace(/\/view$/, '/download'); return url.toString(); }
      return pdfViewUrl;
    } catch (_) { return pdfViewUrl; }
  }

  function buildUC2EmbedUrl(pdfViewUrl) {
    if (!pdfViewUrl) return '';
    const encoded = encodeURIComponent(pdfViewUrl);
    return `pdf-embed.html?file=${encoded}&src=${encoded}`;
  }

  window.addEventListener('resize', () => {
    clearTimeout(uc2ResizeTimer);
    uc2ResizeTimer = setTimeout(() => { fitUC2Viewer(); }, 180);
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

    const payload = { template: normalizedTemplate };
    if (templateMeta.payloadKey === 'modelName') payload.modelName = primaryValue;
    else payload.companyName = primaryValue;

    try {
      const res = await fetch(CONFIG.UC2_WEBHOOK, {
        method: 'POST', cache: 'no-store',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`서버 에러 (${res.status})`);
      const rawText = await res.text();
      let data;
      try { data = JSON.parse(rawText); } catch (parseError) { throw new Error('제안서 생성 응답(JSON) 파싱 실패'); }

      if (data.status && data.status !== 'success') throw new Error(data.message || data.error_detail || '제안서 생성 실패');

      const pptxUrl = pickFirstValidUrl([data.pptxUrl, data.pptx_url, data.download_url]);
      const pdfViewUrl = pickFirstPdfUrl([data.pdfViewUrl, data.pdf_view_url, data.pdfUrl, data.pdf_url, data.pdfDownloadUrl, data.pdf_download_url]);
      const pdfDownloadUrl = pickFirstPdfUrl([data.pdfDownloadUrl, data.pdf_download_url, data.pdfViewUrl, data.pdf_view_url, data.pdfUrl, data.pdf_url]) || buildUC2DownloadUrl(pdfViewUrl);

      if (!pptxUrl) throw new Error('PPTX 다운로드 URL을 받지 못했습니다.');
      if (!pdfViewUrl) throw new Error('유효한 PDF URL을 받지 못했습니다.');

      uc2Loading.style.display = 'none';
      uc2PptxLink.href = pptxUrl; uc2PptxLink.target = '_blank'; uc2PptxLink.rel = 'noopener noreferrer';
      uc2PdfLink.href = pdfDownloadUrl || pdfViewUrl; uc2PdfLink.target = '_blank'; uc2PdfLink.rel = 'noopener noreferrer';
      uc2DownloadArea.style.display = 'flex';
      uc2CurrentPdfViewUrl = pdfViewUrl;
      uc2Frame.src = buildUC2EmbedUrl(pdfViewUrl);
      uc2Frame.style.display = 'block';

      requestAnimationFrame(() => fitUC2Viewer());
    } catch (error) {
      alert('제안서 생성 실패: ' + error.message);
      uc2Loading.style.display = 'none';
      uc2Placeholder.style.display = 'block';
    } finally {
      uc2Btn.disabled = false;
      uc2Btn.textContent = '▶ 초안 생성';
    }
  });

  // ==========================================
  // 🎙️ Use Case 3: Voice Agent (Multi-Agent)
  // ==========================================
  const UC3_AGENTS = {
    'aa200fb3-13eb-4526-8cb2-e6337cb0e179': {
      type: 'I/B',
      name: '제품문의',
      description: 'B2B Inbound 상담 (영어)',
      script: `[Context: A restaurant franchise owner is looking for self-ordering solutions and a menu board system for a new location.]
Agent: Hello! You've reached LG Business Solutions. How can I help you upgrade your workspace today?
Customer: Hi, I'm opening a new fast-casual restaurant. Space is a bit tight, but we need a self-ordering kiosk that customers can use easily.
Agent: Let me check our kiosk options for compact spaces. We have the 22-inch 22KC3P-M self-service kiosk available for $2,400. It features a modular design that lets you easily attach peripherals like barcode scanners. Does this size sound like a good fit for your layout?
Customer: That size is great. We want to make sure it's accessible for all our customers, including wheelchair users. Can we adjust the height?
Agent: Give me just a second to verify the mounting options. Yes, it has versatile stand options sold separately, or it can be wall-mounted. When installed at the proper height, its touch interface perfectly supports ADA compliance. Do you also need any digital menu boards for behind the counter?
Customer: We were actually thinking about a seamless LED wall instead of standard TVs for a more premium look.
Agent: Let me look into our direct view LED signage. To power a stunning LED menu wall, you will use our CEAA LED Controller. You can also use LG Business Cloud to easily manage and update your menus remotely. Would you like me to connect you with an LED specialist to design the perfect wall size?
Customer: Yes, please set that up. And send me the details on that 22-inch kiosk.
Agent: I will arrange that consultation and email you the kiosk quote right away. Thank you for calling LG!`
    },
    'fe2f3a22-3831-4eef-8983-93dfcca5c444': {
      type: 'O/B Lead-intake',
      name: '호주 Marriott B2B',
      description: '디지털 사이니지 (영어)',
      script: `[Context: Liam (AI) is making an outbound call to James Whitfield, Facilities Manager at Marriott Hotels Australia, who recently inquired about digital signage.]
Customer: Hello?
Agent: (runtime opening injected by system — AI disclosure included)
Customer: Yes, go ahead.
Agent: From your inquiry, it sounds like this may be for the lobby and common areas — is that right?
Customer: Yes, correct. We're looking at the main lobby and check-in area, and maybe a couple of dining areas as well.
Agent: And roughly how many displays, units, or zones are you looking at?
Customer: We're thinking around eight to ten screens in total.
Agent: Eight to ten screens — got it. And the inquiry mentioned around one hundred and twenty thousand dollars — is that still roughly right?
Customer: Actually, while I have you — these screens would be running pretty much all day in the hotel lobby. Are LG's commercial displays built for that kind of continuous use?
Agent: [내부: queryCorpus 실행 → UV5N-E 스펙 반환 → Operation Hours: 24/7 / Lifetime: Up to 50,000 Hrs]
Customer: Okay, good to know.
Agent: Coming back to your budget — the inquiry mentioned around one hundred and twenty thousand dollars. Is that still roughly right?
Customer: Yes, that's about where we are. We might have a little flexibility depending on what's recommended.
Agent: Do you have a target installation date or deadline in mind?
Customer: We'd ideally want everything installed before the refurbishment wraps up — end of September.
Agent: So just to confirm — you're looking at Digital Signage solutions for the main lobby, check-in area, and dining areas, around eight to ten screens, with a budget of one hundred and twenty thousand dollars, and aiming for installation before the end of September. Does that sound right?
Customer: Yes, that's the one.
Agent: How would you like our team to follow up — by phone, by email, or with a visit?
Customer: Email.
Agent: I have j dot whitfield at marriottbrisbane dot com dot au on file — is that still the best address?
Customer: Correct.
Agent: Perfect. I've noted that and passed it to the team. They'll be in touch by email based on your preference. Thanks so much for your time, James — have a great day.
Customer: Thanks, Liam. Speak soon.`
    },
    '8c5900e0-eda7-4b0f-9294-0c5688f8c28c': {
      type: 'O/B Lead-intake',
      name: '브라질 Bourbon B2B',
      description: '디지털 사이니지 (포르투갈어)',
      script: `[Context: Ana (AI) is making an outbound call to Carlos Eduardo Figueiredo at Rede Hotéis Bourbon in Brazil.]
Customer: Olá?
Agent: (Sistema abertura em tempo real — Aviso de IA incluído)
Customer: Sim, pode falar.
Agent: Pelo que vi na sua solicitação, parece que seria para o lobby e as áreas comuns do hotel — está correto?
Customer: Isso mesmo.
Agent: E aproximadamente quantas telas, unidades, quartos ou zonas vocês estão pensando?
Customer: Acho que umas 10 telas.
Agent: Entendido — dez telas. A solicitação mencionava em torno de seiscentos e oitenta mil reais — ainda é mais ou menos isso?
Customer: Sim, esse é o orçamento.
Agent: Vocês têm uma data-alvo ou prazo de instalação em mente?
Customer: Até o final de agosto.
Agent: Só para confirmar... vocês estão buscando soluções de Sinalização Digital para o lobby e áreas comuns... em torno de seiscentos e oitenta mil reais... com previsão para o final de agosto. Está correto?
Customer: Sim, está correto.
Agent: Como vocês gostariam que nossa equipe entrasse em contato — por telefone, e-mail ou uma visita presencial?
Customer: Por telefone, por favor.
Agent: Qual dia e horário funcionam melhor para a ligação?
Customer: Na terça-feira à tarde, às duas horas.
Agent: Ótimo — terça-feira à tarde, às duas horas. Já registrei tudo e passei para a equipe. Eles entrarão em contato conforme sua preferência. Muito obrigado pelo seu tempo, Carlos Eduardo — tenha um ótimo dia!
Customer: Obrigado, bom dia.`
    },
    'eb16c363-d698-4166-814b-9100afcdbb16': {
      type: 'O/B Lead-intake',
      name: '싱가포르 Pan Pacific',
      description: '디지털 사이니지 (영어)',
      script: `[Context: Alex (AI) is making an outbound call to Daniel Tan at Pan Pacific Singapore operations.]
Customer: Hello?
Agent: (runtime opening injected by system — AI disclosure included)
Customer: Yes, that's fine.
Agent: Based on your inquiry, it sounds like this may be for the lobby and common areas — is that right?
Customer: Yes, correct.
Agent: And roughly how many displays or zones are you looking at?
Customer: Around ten screens.
Agent: Noted — around ten screens. The inquiry mentioned around one hundred and fifty thousand Singapore dollars — is that still roughly the right range?
Customer: Yes, that's about right.
Agent: Do you have a target installation date or deadline in mind?
Customer: We'd like it done by end of September.
Agent: Just to confirm... you're looking at Digital Signage for the lobby and common areas... around ten screens... with a budget of one hundred and fifty thousand Singapore dollars... and aiming for end of September. Does that sound right?
Customer: Yes, that's correct.
Agent: How would you like our team to follow up — by phone, by email, or with a visit?
Customer: Email, please.
Agent: I have daniel dot tan... at panpacific... dot com on file — is that still the best address to use?
Customer: Yes, that's correct.
Agent: Thank you — I've noted everything and passed it to the team. They'll be in touch based on your preference. Thank you for your time, Mr Tan — have a good day.
Customer: Thank you. Goodbye.`
    }
  };

  const uc3Start = document.getElementById('uc3-startBtn');
  const uc3End = document.getElementById('uc3-endBtn');
  const uc3StatusText = document.getElementById('uc3-statusText');
  const uc3Loading = document.getElementById('uc3-loading');
  const uc3LogArea = document.getElementById('uc3-logArea');
  const uc3LogContent = document.getElementById('uc3-logContent');
  const uc3Visualizer = document.getElementById('uc3-visualizer');
  const uc3Script = document.getElementById('uc3-scriptContent');
  const uc3AgentGrid = document.getElementById('uc3-agentGrid');

  let currentUc3AgentId = 'aa200fb3-13eb-4526-8cb2-e6337cb0e179'; // default Agent
  let currentCallId = null;
  let isUC3Ending = false;
  let uc3SessionSeq = 0;
  let activeUc3SessionSeq = 0;

  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function renderUc3Agents() {
    if (!uc3AgentGrid) return;
    uc3AgentGrid.innerHTML = Object.entries(UC3_AGENTS).map(([id, agent]) => {
      const isActive = id === currentUc3AgentId ? ' is-active' : '';
      return `
        <div class="uc3-agent-card${isActive}" data-agent-id="${id}">
          <div class="uc3-agent-type">${escapeHtml(agent.type)}</div>
          <div class="uc3-agent-name">${escapeHtml(agent.name)}</div>
          <div class="uc3-agent-desc">${escapeHtml(agent.description)}</div>
        </div>
      `;
    }).join('');

    uc3AgentGrid.querySelectorAll('.uc3-agent-card').forEach(card => {
      card.addEventListener('click', () => {
        currentUc3AgentId = card.dataset.agentId;
        renderUc3Agents();
        renderUc3Script();
      });
    });
  }

  function renderUc3Script() {
    const scriptContent = UC3_AGENTS[currentUc3AgentId].script;
    const rawLines = scriptContent.split('\n');
    const htmlLines = rawLines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="script-spacer"></div>';

      if (trimmed.startsWith('[')) {
        return `<div class="context-line"><span class="context-text">${escapeHtml(trimmed)}</span></div>`;
      }

      if (trimmed.startsWith('Agent:') || trimmed.startsWith('Ana:') || trimmed.startsWith('Liam:') || trimmed.startsWith('Alex:')) {
        const colonIdx = trimmed.indexOf(':');
        const text = trimmed.slice(colonIdx + 1).trim();
        return `
          <div class="agent-line">
            <span class="speaker-badge agent-badge">Agent</span>
            <span class="agent-text">${escapeHtml(text)}</span>
          </div>`;
      }

      if (trimmed.startsWith('User:') || trimmed.startsWith('Customer:') || trimmed.startsWith('고객:')) {
        const colonIdx = trimmed.indexOf(':');
        const text = trimmed.slice(colonIdx + 1).trim();
        return `
          <div class="user-line">
            <span class="speaker-badge user-badge">User</span>
            <span class="user-text">${escapeHtml(text)}</span>
          </div>`;
      }

      return `<div class="script-line script-free">${escapeHtml(trimmed)}</div>`;
    });
    uc3Script.innerHTML = htmlLines.join('');
  }

  // 초기화 렌더링
  if (uc3AgentGrid && uc3Script) {
    renderUc3Agents();
    renderUc3Script();
  }

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
    try { await window.uvSession.leaveCall(); } catch (e) { console.warn(e); } finally { window.uvSession = null; }
  }

  function uc3NormalizeConversation(rawConversation) {
    const list = Array.isArray(rawConversation) ? rawConversation : [];
    return list.map((item, idx) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const role = String(item.role || '').trim() || 'Agent';
        const text = String(item.text || '').trim();
        const rawIndex = item.index ?? (idx + 1);
        const index = Number.isFinite(Number(rawIndex)) ? Number(rawIndex) : (idx + 1);
        if (!text) return null;
        return { index, role, text };
      }
      const line = String(item ?? '').trim();
      if (!line) return null;
      const matched = line.match(/^\s*(\d+)\)\s*(User|Agent)\s*:\s*([\s\S]*)$/i);
      if (matched) return { index: Number(matched[1]), role: matched[2], text: matched[3].trim() };
      return { index: idx + 1, role: 'Agent', text: line.replace(/^\s*\d+\)\s*/, '').trim() };
    }).filter(Boolean);
  }

  function uc3NormalizeLogData(data) {
    const normalizedConversation = uc3NormalizeConversation(data?.conversation ?? data?.log ?? []);
    const rawStatus = String(data?.status || '').trim();
    const summary = String(data?.summary || '').trim();
    return {
      ...data,
      summary,
      status: rawStatus || (normalizedConversation.length > 0 || summary ? 'SUCCESS' : 'UNKNOWN'),
      conversation: normalizedConversation
    };
  }

  function createCallLogCard(data) {
    const normalized = uc3NormalizeLogData(data || {});
    const summary = normalized.summary || '요약이 제공되지 않았습니다.';
    const status = normalized.status || 'UNKNOWN';
    const conversation = normalized.conversation;

    let badgeClass = 'info';
    const s = status.toLowerCase();
    if (s.includes('성공') || s.includes('success') || s.includes('완료')) badgeClass = 'success';
    if (s.includes('대기') || s.includes('중단') || s.includes('cancel')) badgeClass = 'warning';

    const conversationHtml = conversation.length > 0
      ? `<div class="log-section"><span class="log-label">대화 내용</span><div class="conversation-list">
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
              </div>`;
      }).join('')}
        </div></div>`
      : `<div class="log-section"><span class="log-label">대화 내용</span><div class="log-value">표시할 대화 내용이 없습니다.</div></div>`;

    return `
    <div class="log-card calllog-card">
      <div class="log-card-header"><h4>🎤 AI 통화 분석 리포트</h4><span class="status-badge ${badgeClass}">${escapeHtml(status)}</span></div>
      <div class="log-card-body">
        <div class="log-section"><span class="log-label">대화 요약</span><div class="log-value summary-highlight">${escapeHtml(summary)}</div></div>
        ${conversationHtml}
        <div class="raw-json-area">
          <details><summary class="raw-json-toggle">🔍 원본 JSON 데이터 보기</summary>
          <pre style="font-size: 0.7rem; background: #f1f5f9; padding: 10px; margin-top: 8px; border-radius: 6px; overflow-x: auto; border: 1px solid #e2e8f0;">${escapeHtml(JSON.stringify(normalized, null, 2))}</pre></details>
        </div>
      </div>
    </div>`;
  }

  async function finalizeUC3Call({ autoTriggered = false, sessionSeq = activeUc3SessionSeq, forceCallId = null } = {}) {
    if (isUC3Ending) return;
    const targetCallId = forceCallId || currentCallId;

    if (sessionSeq !== activeUc3SessionSeq) return;
    if (!targetCallId) return;

    isUC3Ending = true;

    try {
      uc3StatusText.innerText = autoTriggered ? '통화 종료됨. 콜 로그 처리 중...' : '콜 로그 처리 중...';
      uc3End.style.display = 'none';
      uc3Visualizer.style.display = 'none';
      clearUC3LogView();
      uc3Loading.style.display = 'block';

      await safeLeaveCurrentSession();

      // 1) 현재 선택된 에이전트의 이름을 가져옵니다.
      const currentAgentName = UC3_AGENTS[currentUc3AgentId]?.name || 'Unknown Agent';

      const res = await fetch(CONFIG.UC3_END_CALL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        // 2) payload에 name 필드를 추가하여 전송합니다.
        body: JSON.stringify({
          callId: targetCallId,
          name: currentAgentName
        })
      });

      if (!res.ok) throw new Error(`로그 데이터 수신 실패 (${res.status})`);
      const logData = await res.json();

      if (sessionSeq !== activeUc3SessionSeq) return;

      uc3Loading.style.display = 'none';
      uc3StatusText.innerText = '대기 중';
      uc3LogContent.innerHTML = createCallLogCard(logData);
      uc3LogArea.style.display = 'flex';
    } catch (error) {
      if (sessionSeq !== activeUc3SessionSeq) return;
      console.error('UC3 finalize error:', error);
      uc3Loading.style.display = 'none';
      uc3StatusText.innerText = '대기 중';
      uc3LogContent.innerHTML = `
        <div style="color: var(--danger); padding: 16px; background: #fee2e2; border-radius: 8px; border: 1px solid #fecaca;">
          <strong>⚠️ 데이터 로드 실패</strong><br><span style="font-size: 0.85rem;">${error.message}</span>
        </div>`;
      uc3LogArea.style.display = 'flex';
    } finally {
      if (sessionSeq === activeUc3SessionSeq) {
        currentCallId = null;
        isUC3Ending = false;
        resetUC3ToIdle('📞 통화 다시 시작');
      } else { isUC3Ending = false; }
    }
  }

  function bindUltravoxSessionEvents(session, sessionSeq) {
    session.addEventListener('status', async () => {
      if (sessionSeq !== activeUc3SessionSeq) return;
      const status = session.status;

      if (status === 'connecting') { uc3StatusText.innerText = '통화 연결 중...'; return; }
      if (['idle', 'listening', 'thinking', 'speaking'].includes(status)) {
        uc3StatusText.innerText = `통화 중 (${status})`;
        uc3Start.style.display = 'none';
        uc3End.style.display = 'flex';
        uc3Visualizer.style.display = 'flex';
        uc3Loading.style.display = 'none';
        clearUC3LogView();
        return;
      }
      if (status === 'disconnecting') { uc3StatusText.innerText = '통화 종료 중...'; return; }
      if (status === 'disconnected') {
        uc3StatusText.innerText = '통화 종료됨';
        if (currentCallId && !isUC3Ending) await finalizeUC3Call({ autoTriggered: true, sessionSeq, forceCallId: currentCallId });
      }
    });
  }

  uc3Start.addEventListener('click', async () => {
    try {
      if (typeof window.UltravoxSession === 'undefined') throw new Error('Ultravox SDK가 브라우저에 로드되지 않았습니다.');

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

      // UI에서 선택한 에이전트 식별자 전달
      const payload = {
        agentId: currentUc3AgentId
      };

      const res = await fetch(CONFIG.UC3_START_CALL, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`웹훅 호출 실패 (${res.status})`);
      const data = await res.json();

      if (nextSessionSeq !== activeUc3SessionSeq) return;

      const joinUrl = data.joinUrl || data.join_url || data?.data?.joinUrl || data?.data?.join_url || '';
      const callId = data.callId || data.call_id || data?.data?.callId || data?.data?.call_id || null;

      if (!joinUrl) throw new Error('올바른 joinUrl을 받지 못했습니다.');

      currentCallId = callId;
      uc3Start.innerText = '마이크 권한 요청 중...';
      uc3StatusText.innerText = '마이크 권한을 확인하고 있습니다.';

      const session = new window.UltravoxSession();
      window.uvSession = session;
      bindUltravoxSessionEvents(session, nextSessionSeq);
      await session.joinCall(joinUrl);
    } catch (error) {
      alert('통화 연결 실패: ' + error.message);
      await safeLeaveCurrentSession();
      currentCallId = null;
      isUC3Ending = false;
      clearUC3LogView();
      resetUC3ToIdle();
    }
  });

  uc3End.addEventListener('click', async () => {
    await finalizeUC3Call({ autoTriggered: false, sessionSeq: activeUc3SessionSeq, forceCallId: currentCallId });
  });

  // ==========================================
  // [이하 UC4 Text-to-SQL 코드는 기존 100% 동일]
  // ==========================================
  const UC4_SCENARIOS = {
    '1': {
      id: '1', type: 'open_pipeline_priority_worklist', cardCode: 'OPEN_PIPELINE_PRIORITY_WORKLIST', cardShortCode: 'OPEN_PIPELINE_PRIORITY', cardTitle: '가장 먼저 확인해야 할 고액 오픈 딜은?', cardDescription: '고액 · 마감 임박 · 오픈 딜 우선순위', sessionSummary: '박종명 · Open Pipeline Worklist · 고액/마감 임박 딜 우선순위',
      question: '내 현재 오픈 기회 중에서 Close Date가 지나지 않은 건만 대상으로, 금액이 큰 순으로 5건을 보여줘. 각 건의 단계, 금액, Close Date를 같이 보여주고, 특히 마감이 임박한 건은 왜 먼저 봐야 하는지도 설명해줘.',
      keywords: ['고액 오픈 딜', '마감 임박', '우선순위'],
      session_context: { timezone: 'Asia/Seoul', current_date: '2025-03-20', record_page_object: null, record_id: null, account_id: null, opportunity_id: null, owner_id: '0052x000003pHryAAE' },
      candidate_models: ['analytics_mart_dbt.obt_opportunity_search'],
      variants: [
        { id: '1-v1', label: '금액 상위 5건', question: '내 현재 오픈 기회 중 금액 상위 5건을 보여줘. Close Date가 지나지 않은 건만 보고, 각 건의 단계와 마감일을 같이 설명해줘.' },
        { id: '1-v2', label: '2주 내 마감', question: '내 오픈 기회 중에서 금액이 큰 순으로 5건을 보여주고, 특히 2주 안에 마감되는 건은 왜 우선 점검해야 하는지도 말해줘.' },
        { id: '1-v3', label: '우선순위 설명', question: '내 현재 파이프라인에서 지금 바로 확인해야 할 고액 오픈 딜 5건을 보여줘. 단계, 금액, Close Date를 함께 보고 우선순위를 설명해줘.' }
      ]
    },
    '2': {
      id: '2', type: 'open_pipeline_composition', cardCode: 'OPEN_PIPELINE_COMPOSITION', cardShortCode: 'PIPELINE_COMPOSITION', cardTitle: '내 파이프라인은 어디에 쌓여 있고, 어디에 돈이 몰려 있을까?', cardDescription: '단계별 건수/금액 집중도', sessionSummary: '박종명 · Open Pipeline Composition · 단계별 건수/금액 집중도',
      question: '내 현재 오픈 파이프라인이 어느 단계에 가장 많이 쌓여 있고, 금액은 어느 단계에 가장 많이 집중돼 있는지 보여줘. 단계별 건수와 금액을 같이 비교해서 어디가 적체 구간인지 설명해줘.',
      keywords: ['Stage Mix', 'Amount Focus', 'Bottleneck'],
      session_context: { timezone: 'Asia/Seoul', current_date: '2026-04-16', record_page_object: null, record_id: null, account_id: null, opportunity_id: null, owner_id: '0052x000003pHryAAE' },
      candidate_models: ['analytics_mart_dbt.fct_opportunity_current'],
      variants: [
        { id: '2-v1', label: 'Stage 몰림', question: '내 오픈 파이프라인은 어떤 stage에 가장 많이 몰려 있어? 건수 기준과 금액 기준을 같이 보여주고, 둘 사이 차이도 설명해줘.' },
        { id: '2-v2', label: '적체/금액 단계', question: '현재 내 pipeline에서 적체가 가장 심한 단계와, 금액이 가장 크게 걸려 있는 단계를 각각 보여줘.' },
        { id: '2-v3', label: '단계별 비교', question: '내 오픈 영업기회를 단계별로 나눠서 건수와 금액을 비교해줘. 어디에 물량이 쌓여 있고 어디에 큰 딜이 몰려 있는지 알고 싶어.' }
      ]
    },
    '3': {
      id: '3', type: 'specific_opportunity_commercial_diagnosis', cardCode: 'SPECIFIC_OPPORTUNITY_COMMERCIAL_DIAGNOSIS', cardShortCode: 'COMMERCIAL_DIAGNOSIS', cardTitle: '이 Opportunity 전반을 진단해줘', cardDescription: 'Quote 승인/동기화 · 금액 일관성 · 라인 규모', sessionSummary: '박성주 · Opportunity Record Page · 이제너두 commercial detail',
      question: '이 기회의 상업 구조를 브리핑해줘. 현재 단계와 Forecast, 견적 승인/동기화 상태, 견적 금액, 라인아이템 규모, 그리고 금액 일관성(견적 소계·총액·라인 합계)이 맞는지도 함께 설명해줘.',
      keywords: ['Quote Detail', 'Appr. Quote', 'Consistency'],
      session_context: { timezone: 'Asia/Seoul', current_date: '2026-04-16', record_page_object: 'Opportunity', record_id: '006Ih000003oU96IAE', account_id: '0012x00000cVyjMAAS', opportunity_id: '006Ih000003oU96IAE', owner_id: '005Ih000000xfxcIAA' },
      candidate_models: ['analytics_mart_dbt.mart_opportunity_commercial_detail'],
      variants: [
        { id: '3-v1', label: 'Quote 기준', question: '이 기회의 상업 구조를 quote 기준으로 설명해줘. 승인 상태, 동기화 상태, 금액 규모와 라인아이템 규모를 같이 보여줘.' },
        { id: '3-v2', label: 'Commercial 요약', question: '현재 보고 있는 Opportunity의 commercial detail을 요약해줘. 단계, forecast, quote 상태, 금액, 수량, 서비스일을 함께 설명해줘.' },
        { id: '3-v3', label: '금액 일관성', question: '이 딜의 견적/상업 구조가 일관적인지 봐줘. 견적 소계·총액·라인 합계가 맞는지와 서비스일 구조를 같이 설명해줘.' }
      ]
    },
    '4': {
      id: '4', type: 'specific_opportunity_product_mix', cardCode: 'SPECIFIC_OPPORTUNITY_PRODUCT_MIX', cardShortCode: 'PRODUCT_MIX', cardTitle: '이 딜에서 어떤 품목이 금액 대부분을 만들고 있을까?', cardDescription: 'Product Mix Summary · 상위 3개 품목 ID 집중도', sessionSummary: '박성주 · Opportunity Record Page · Product Mix Summary',
      question: '이 기회의 제품 믹스를 요약해줘. 총 라인 수, 총수량, 총액과 함께 금액 기준 상위 3개 품목 ID의 수량, 단가, 총액을 한 번에 보여줘.',
      keywords: ['Product Mix', 'Top 3 Items', 'Aggregate'],
      session_context: { timezone: 'Asia/Seoul', current_date: '2026-04-16', record_page_object: 'Opportunity', record_id: '006Ih000003oU96IAE', account_id: '0012x00000cVyjMAAS', opportunity_id: '006Ih000003oU96IAE', owner_id: '005Ih000000xfxcIAA' },
      candidate_models: ['analytics_mart_dbt.fct_opportunity_line_item'],
      variants: [
        { id: '4-v1', label: '제품 구성', question: '이 기회의 제품 구성을 요약해줘. 전체 라인 수와 총액을 보여주고, 금액 상위 3개 품목 ID의 수량·단가·총액을 같이 설명해줘.' },
        { id: '4-v2', label: 'Deal value', question: '현재 Opportunity에서 어떤 품목 ID가 deal value를 가장 많이 차지하는지 보여줘. 총 라인 수, 총수량, 총액과 상위 3개 품목의 금액을 함께 보고 싶어.' },
        { id: '4-v3', label: 'Top 3 품목', question: '이 딜의 product mix를 한 줄 요약이 아니라 집계형으로 보여줘. 전체 규모와 함께 금액 기준 top 3 품목 ID를 설명해줘.' }
      ]
    },
    '5': {
      id: '5', type: 'specific_opportunity_stage_history_timeline', cardCode: 'SPECIFIC_OPPORTUNITY_STAGE_HISTORY_TIMELINE', cardShortCode: 'STAGE_HISTORY_TIMELINE', cardTitle: '이 딜은 어떤 단계를 거쳐 수주까지 왔을까?', cardDescription: 'Stage History Timeline · 단계/확률/예상매출 변화', sessionSummary: '박종명 · Opportunity Record Page · Stage History Timeline',
      question: '이 기회의 stage history를 날짜 기준 timeline으로 보여줘. 각 단계가 어떤 순서로 바뀌었는지와 함께 금액, 예상매출, 확률이 어떻게 변했는지도 간단히 설명해줘.',
      keywords: ['Timeline', 'Probability', 'Revenue'],
      session_context: { timezone: 'Asia/Seoul', current_date: '2026-04-16', record_page_object: 'Opportunity', record_id: '006Ih000003oOgyIAE', account_id: '0012x00000cbJRQAA2', opportunity_id: '006Ih000003oOgyIAE', owner_id: '0052x000003pHryAAE' },
      candidate_models: ['analytics_mart_dbt.fct_opportunity_stage_history'],
      variants: [
        { id: '5-v1', label: 'Closed Won 경로', question: '이 기회가 어떤 stage들을 거쳐 Closed Won까지 왔는지 날짜 순으로 보여줘. 단계별로 예상매출과 확률 변화도 같이 설명해줘.' },
        { id: '5-v2', label: 'Progression', question: '현재 보고 있는 Opportunity의 progression timeline을 보여줘. stage 변경 흐름과 금액/예상매출/확률 변화가 어떻게 이어졌는지 보고 싶어.' },
        { id: '5-v3', label: '시간순 이력', question: '이 딜의 진행 이력을 시간순으로 정리해줘. Registration부터 Closed Won까지 어떤 단계 전환이 있었고, 그 과정에서 숫자가 어떻게 바뀌었는지 설명해줘.' }
      ]
    }
  };

  const uc4ScenarioGrid = document.getElementById('uc4-scenarioGrid');
  const uc4ContextZone = document.getElementById('uc4-contextZone');
  const uc4VariantStrip = document.getElementById('uc4-variantStrip');
  const uc4QuestionInput = document.getElementById('uc4-questionInput');
  const uc4RunBtn = document.getElementById('uc4-runBtn');
  const uc4ResultPanels = document.getElementById('uc4-resultPanels');

  let uc4SelectedScenarioId = null;
  let uc4SelectedVariantId = null;
  let uc4AbortController = null;
  let uc4PendingRequestId = null;

  function uc4EscapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function uc4ShortModelName(model) { const raw = String(model ?? '').trim(); if (!raw) return '-'; const parts = raw.split('.'); return parts[parts.length - 1] || raw; }
  function uc4SafeArray(v) { return Array.isArray(v) ? v : []; }
  function uc4FormatNumber(value, { maximumFractionDigits = 0 } = {}) { const num = Number(value); if (!Number.isFinite(num)) return String(value ?? 'null'); return new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(num); }
  function uc4FormatCurrencyCompact(value) { const num = Number(value); if (!Number.isFinite(num)) return String(value ?? 'null'); if (Math.abs(num) >= 100000000) return `${(num / 100000000).toFixed(2)}억`; return `${uc4FormatNumber(num)}원`; }
  function uc4FormatDate(value) { if (!value) return 'null'; const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value); return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(date); }
  function uc4FormatCell(value) { if (value === null || value === undefined) return 'null'; if (typeof value === 'number') return uc4FormatNumber(value, { maximumFractionDigits: 6 }); if (typeof value === 'boolean') return value ? 'true' : 'false'; if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return uc4FormatDate(value); return String(value); }
  function uc4CreateRequestId() { if (window.crypto?.randomUUID) return `uc4_${window.crypto.randomUUID()}`; return `uc4_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
  function uc4GetSelectedScenario() { return uc4SelectedScenarioId ? UC4_SCENARIOS[uc4SelectedScenarioId] : null; }
  function uc4FindMatchingVariant(scenario, question) { if (!scenario) return null; const normalized = String(question ?? '').trim(); return scenario.variants.find((variant) => variant.question.trim() === normalized) ?? null; }
  function uc4UpdateRunButtonState() { const hasScenario = Boolean(uc4SelectedScenarioId); const hasQuestion = String(uc4QuestionInput?.value ?? '').trim().length > 0; uc4RunBtn.disabled = !(hasScenario && hasQuestion); }

  function uc4RenderVariantStrip(scenario) {
    if (!uc4VariantStrip) return;
    if (!scenario) { uc4VariantStrip.innerHTML = '<span class="uc4-variant-empty">상단 질문 세트를 선택하면 변주 질문과 키워드가 표시됩니다.</span>'; return; }
    const keywordBadges = uc4SafeArray(scenario.keywords).map((k) => `<span class="uc4-keyword-chip"># ${uc4EscapeHtml(k)}</span>`).join('');
    uc4VariantStrip.innerHTML = `
      <div class="uc4-variant-headline"><div class="uc4-variant-copy"><strong>${uc4EscapeHtml(scenario.cardTitle || scenario.cardCode || scenario.type)}</strong><span>${uc4EscapeHtml(scenario.cardDescription || '')}</span></div><div class="uc4-keyword-strip">${keywordBadges}</div></div>
      <div class="uc4-variant-buttons">${scenario.variants.map((v) => `<button type="button" class="uc4-variant-chip${v.id === uc4SelectedVariantId ? ' is-active' : ''}" data-variant-id="${uc4EscapeHtml(v.id)}">${uc4EscapeHtml(v.label)}</button>`).join('')}</div>
    `;
    uc4VariantStrip.querySelectorAll('.uc4-variant-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const v = scenario.variants.find((x) => x.id === chip.dataset.variantId);
        if (!v) return;
        uc4SelectedVariantId = v.id; uc4QuestionInput.value = v.question;
        uc4RenderVariantStrip(scenario); uc4UpdateRunButtonState(); uc4QuestionInput.focus();
      });
    });
  }

  function uc4RenderScenarioCards() {
    if (!uc4ScenarioGrid) return;
    uc4ScenarioGrid.innerHTML = Object.values(UC4_SCENARIOS).map((s) => `
      <button class="uc4-scenario-card${s.id === uc4SelectedScenarioId ? ' is-active' : ''}" data-scenario="${uc4EscapeHtml(s.id)}" type="button">
        <div class="uc4-scenario-top">
          <span class="uc4-scenario-index">${uc4EscapeHtml(s.id)}</span>
          <div class="uc4-scenario-topcopy">
            <div class="uc4-scenario-type">${uc4EscapeHtml(s.cardShortCode || s.cardCode || s.type)}</div>
            <div class="uc4-scenario-question">${uc4EscapeHtml(s.cardTitle || s.question)}</div>
          </div>
        </div>
        <div class="uc4-scenario-sub">${uc4EscapeHtml(s.cardDescription || s.sessionSummary || '')}</div>
        <div class="uc4-scenario-keywords">${uc4SafeArray(s.keywords).slice(0, 3).map((k) => `<span class="uc4-scenario-keyword">${uc4EscapeHtml(k)}</span>`).join('')}</div>
      </button>`).join('');
    uc4ScenarioGrid.querySelectorAll('.uc4-scenario-card').forEach((c) => c.addEventListener('click', () => uc4SelectScenario(c.dataset.scenario, { populateQuestion: true })));
  }

  function uc4RenderContextPanels() {
    if (!uc4ContextZone) return;
    uc4ContextZone.innerHTML = Object.values(UC4_SCENARIOS).map((s) => {
      const ctx = s.session_context ?? {};
      return `
        <details class="uc4-context-details${s.id === uc4SelectedScenarioId ? ' is-active' : ''}" data-scenario="${uc4EscapeHtml(s.id)}"${s.id === uc4SelectedScenarioId ? ' open' : ''}>
          <summary><div class="uc4-summary-copy"><strong>세션 컨텍스트</strong><span>${uc4EscapeHtml(s.sessionSummary || '')}</span></div>
          <div class="uc4-summary-pills"><span class="uc4-summary-pill">owner_id · ${uc4EscapeHtml(ctx.owner_id ?? 'null')}</span></div></summary>
          <div class="uc4-context-body"><div class="uc4-context-grid">
            <div class="uc4-context-item"><span>record_page_object</span><strong>${uc4EscapeHtml(ctx.record_page_object ?? 'null')}</strong></div>
            <div class="uc4-context-item"><span>record_id</span><strong>${uc4EscapeHtml(ctx.record_id ?? 'null')}</strong></div>
            <div class="uc4-context-item"><span>account_id</span><strong>${uc4EscapeHtml(ctx.account_id ?? 'null')}</strong></div>
            <div class="uc4-context-item"><span>opportunity_id</span><strong>${uc4EscapeHtml(ctx.opportunity_id ?? 'null')}</strong></div>
          </div></div>
        </details>`;
    }).join('');
  }

  function uc4ActivateContext(scenarioId) {
    document.querySelectorAll('.uc4-context-details').forEach((d) => { const isTarget = d.dataset.scenario === scenarioId; d.classList.toggle('is-active', isTarget); isTarget ? d.setAttribute('open', '') : d.removeAttribute('open'); });
  }

  function uc4ActivateScenarioCard(scenarioId) {
    document.querySelectorAll('.uc4-scenario-card').forEach((c) => c.classList.toggle('is-active', c.dataset.scenario === scenarioId));
  }

  function uc4SelectScenario(scenarioId, { populateQuestion = true, preferredVariantId = null } = {}) {
    const scenario = UC4_SCENARIOS[scenarioId]; if (!scenario) return;
    uc4SelectedScenarioId = scenarioId; uc4ActivateScenarioCard(scenarioId); uc4ActivateContext(scenarioId);
    const defaultVariant = preferredVariantId ? scenario.variants.find((v) => v.id === preferredVariantId) : null;
    uc4SelectedVariantId = defaultVariant?.id ?? null;
    if (populateQuestion) uc4QuestionInput.value = defaultVariant?.question ?? scenario.question ?? '';
    uc4RenderVariantStrip(scenario); uc4UpdateRunButtonState();
  }

  function uc4RenderEmptyState(message = '상단 질문 세트를 선택하면 세션 컨텍스트와 질문이 준비됩니다.') {
    uc4ResultPanels.innerHTML = `<div class="uc4-result-panel uc4-result-empty is-active"><div class="uc4-empty-state"><div class="uc4-empty-icon">🧠</div><h3>Text-to-SQL 시연 준비 완료</h3><p>${uc4EscapeHtml(message)}</p></div></div>`;
  }

  function uc4RenderLoadingState(question) {
    uc4ResultPanels.innerHTML = `<div class="uc4-result-panel is-active"><div class="uc4-loading-state"><div class="uc4-loading-spinner"></div><h3>SQL 실행 및 AI 브리핑 생성 중</h3><p>${uc4EscapeHtml(question)}</p></div></div>`;
  }

  function uc4BuildRowsPreviewTable(rows) {
    const safeRows = uc4SafeArray(rows); if (!safeRows.length) return '';
    const columns = [...new Set(safeRows.flatMap((row) => Object.keys(row ?? {})))].slice(0, 8); if (!columns.length) return '';
    const thead = columns.map((col) => `<th>${uc4EscapeHtml(col)}</th>`).join('');
    const tbody = safeRows.slice(0, 10).map((row) => `<tr>${columns.map((col) => `<td>${uc4EscapeHtml(uc4FormatCell(row?.[col]))}</td>`).join('')}</tr>`).join('');
    return `<details class="uc4-details" open><summary>Rows Preview</summary><div class="uc4-table-wrap"><table class="uc4-result-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div></details>`;
  }

  function uc4BuildSqlDetails(response) {
    const sql = response?.sql_result?.sql; if (!sql) return '';
    return `<details class="uc4-details"><summary>Generated SQL Trace</summary><pre class="uc4-code-block">${uc4EscapeHtml(sql)}</pre></details>`;
  }

  function uc4RenderResponse(response) {
    const status = String(response?.status ?? 'UNKNOWN').toUpperCase();
    const badgeClass = status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'info';
    const briefing = response?.ai_briefing || (status === 'SUCCESS' ? 'AI 브리핑이 비어 있습니다.' : response?.diagnostics?.message || '오류가 발생했습니다.');
    const scenario = uc4GetSelectedScenario();

    uc4ResultPanels.innerHTML = `
      <div class="uc4-result-panel is-active">
        <div class="uc4-runtime-grid">
          <div class="uc4-response-topline"><span class="status-badge ${badgeClass}">${uc4EscapeHtml(status)}</span></div>
          <div class="uc4-result-card uc4-answer-card">
            <div class="uc4-result-title">${uc4EscapeHtml(scenario?.cardTitle || 'AI 브리핑')}</div>
            <div class="uc4-result-text">${uc4EscapeHtml(briefing)}</div>
          </div>
          ${uc4BuildRowsPreviewTable(response?.sql_result?.rows_preview)}
          ${uc4BuildSqlDetails(response)}
        </div>
      </div>
    `;
  }

  function uc4RenderErrorState(title, message) {
    uc4ResultPanels.innerHTML = `<div class="uc4-result-panel is-active"><div class="uc4-error-state"><div class="uc4-error-icon">⚠️</div><h3>${uc4EscapeHtml(title)}</h3><p>${uc4EscapeHtml(message)}</p></div></div>`;
  }

  async function uc4RunQuery() {
    const scenario = uc4GetSelectedScenario();
    const question = String(uc4QuestionInput.value ?? '').trim();
    if (!scenario || !question) return;

    const requestId = uc4CreateRequestId(); uc4PendingRequestId = requestId;
    if (uc4AbortController) try { uc4AbortController.abort(); } catch (_) { }
    uc4AbortController = new AbortController();

    uc4RunBtn.disabled = true; uc4RunBtn.classList.add('uc4-run-pulse'); uc4RenderLoadingState(question);

    try {
      const res = await fetch(CONFIG.UC4_WEBHOOK, {
        method: 'POST', cache: 'no-store', signal: uc4AbortController.signal,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, question, session_context: scenario.session_context, candidate_models: scenario.candidate_models })
      });
      if (!res.ok) throw new Error(`서버 에러 (${res.status})`);
      const rawText = await res.text();
      let parsed; try { parsed = JSON.parse(rawText); } catch (e) { throw new Error('응답 파싱 실패'); }
      const data = Array.isArray(parsed) ? (parsed[0] ?? {}) : parsed;
      if (uc4PendingRequestId !== requestId) return;
      uc4RenderResponse(data);
    } catch (error) {
      if (error.name === 'AbortError') return;
      uc4RenderErrorState('Text-to-SQL 실행 실패', error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      if (uc4PendingRequestId === requestId) uc4RunBtn.disabled = false;
      setTimeout(() => uc4RunBtn.classList.remove('uc4-run-pulse'), 800);
    }
  }

  if (uc4ScenarioGrid && uc4QuestionInput && uc4RunBtn && uc4ResultPanels) {
    uc4RenderScenarioCards(); uc4RenderContextPanels(); uc4RenderVariantStrip(null); uc4RenderEmptyState();
    uc4QuestionInput.value = ''; uc4UpdateRunButtonState();
    uc4QuestionInput.addEventListener('input', () => {
      const scenario = uc4GetSelectedScenario();
      const matchingVariant = uc4FindMatchingVariant(scenario, uc4QuestionInput.value);
      uc4SelectedVariantId = matchingVariant?.id ?? null;
      uc4RenderVariantStrip(scenario); uc4UpdateRunButtonState();
    });
    uc4RunBtn.addEventListener('click', uc4RunQuery);
  }

  // ==========================================
  // 🎓 Use Case 5: AI 임직원 교육 자료 생성기 (Bottom Placement Only)
  // ==========================================

  // 1. State Scoping Management
  let uc5SelectedMacroShell = 'auto';
  let uc5SelectedTemplate = 'template_matrix'; // legacy renderer fallback
  let uc5UploadedFile = null;
  let uc5UploadedFileKey = '';
  let uc5SourceHandleData = null;
  let uc5SourceHandleFileKey = '';
  let uc5ActivePageIndex = 1;
  let uc5SlidesData = null;
  let uc5PlanningDraftData = null;
  let uc5CurrentUiSelectionData = null;
  let uc5TemplateBoundBlueprintData = null;
  let uc5SlotPayloadSeedData = null;
  let uc5SourceCoverageSummaryData = null;
  let uc5PipelineStatus = 'idle';
  let uc5RenderPlanData = null;
  let uc5RenderPlanScreenIndex = 0;
  let uc5RenderPlanInteractionState = {};
  let uc5PreviewFitRaf = null;
  let confettiTimer = null;
  let uc5SavedPreviewActiveId = '';
  let uc5SavedPreviewRecords = [];
  let uc5SavedPreviewStatus = 'idle';
  let uc5SavedHtmlPreviewData = null;
  let uc5FirebaseClientPromise = null;

  const UC5_SAVED_PREVIEW_COLLECTION = 'uc5_saved_previews';
  const UC5_SAVED_PREVIEW_CHUNK_COLLECTION = 'chunks';
  const UC5_SAVED_PREVIEW_CHUNK_TARGET_BYTES = 650 * 1024;
  const UC5_SAVED_PREVIEW_LIMIT = 50;
  const UC5_FIREBASE_SDK_VERSION = '10.14.1';
  const UC5_R3D_SCREENS_PER_SHARD = 1;
  const UC5_R3D_MAX_SECTIONS_PER_SHARD = 4;

  const UC5_MACRO_SHELL_META = {
    auto: {
      label: 'AI 추천',
      activeText: 'AI 추천 대기',
      legacyTemplateId: 'template_matrix',
      templateId: 'auto'
    },
    learning_canvas: {
      label: 'Learning Canvas',
      activeText: '개념 이해형 교육',
      legacyTemplateId: 'template_matrix',
      templateId: 'learning_canvas.core_concept_flow'
    },
    process_playbook: {
      label: 'Process Playbook',
      activeText: '업무 절차형 교육',
      legacyTemplateId: 'template_journey',
      templateId: 'process_playbook.operational_step_flow'
    },
    decision_simulator: {
      label: 'Decision Simulator',
      activeText: '상황 판단형 교육',
      legacyTemplateId: 'template_split',
      templateId: 'decision_simulator.scenario_decision_flow'
    }
  };

  // 2. DOM Queries
  const macroShellInputs = document.querySelectorAll('input[name="uc5-macroShell"]');
  const legacyTemplateInputs = document.querySelectorAll('input[name="uc5-template"]'); // backward compatibility only

  const uc5PlanningMode = document.getElementById('uc5-planningMode');
  const uc5ContentDensity = document.getElementById('uc5-contentDensity');
  const uc5TargetAudience = document.getElementById('uc5-targetAudience');
  const uc5TargetDuration = document.getElementById('uc5-targetDuration');
  const uc5InteractionLevel = document.getElementById('uc5-interactionLevel');
  const uc5GamificationLevel = document.getElementById('uc5-gamificationLevel');
  const uc5AdminNotes = document.getElementById('uc5-adminNotes');

  const uc5FileInput = document.getElementById('uc5-fileInput');
  const uc5Dropzone = document.getElementById('uc5-dropzone');
  const uc5UploadPrompt = document.getElementById('uc5-uploadPrompt');
  const uc5FileNameDisplay = document.getElementById('uc5-fileNameDisplay');
  const uc5RunBtn = document.getElementById('uc5-runBtn');
  const uc5AiRecommendBtn = document.getElementById('uc5-aiRecommendBtn');
  const uc5LearningConditionsBox = document.getElementById('uc5-learningConditionsBox');
  const uc5SelectionModeChip = document.getElementById('uc5-selectionModeChip');
  const uc5ConditionStateChip = document.getElementById('uc5-conditionStateChip');
  const uc5ActionHelper = document.getElementById('uc5-actionHelper');

  const btnDesktop = document.getElementById('uc5-btnDesktop');
  const btnMobile = document.getElementById('uc5-btnMobile');
  const viewportCanvas = document.getElementById('uc5-viewportCanvas');
  const previewStage = document.getElementById('uc5-previewStage');
  const loadingOverlay = document.getElementById('uc5-loadingOverlay');
  const chassisWrapper = viewportCanvas?.querySelector('.uc5-chassis-wrapper') || null;
  const uc5LoadingText = loadingOverlay?.querySelector('.uc5-loading-text') || null;
  const uc5LoadingSubtext = loadingOverlay?.querySelector('.uc5-loading-subtext') || null;

  const paginationFooter = document.getElementById('uc5-paginationFooter');
  const prevBtn = document.getElementById('uc5-prevBtn');
  const nextBtn = document.getElementById('uc5-nextBtn');
  const pageIndicator = document.getElementById('uc5-pageIndicator');
  const activeLayoutText = document.getElementById('uc5-activeLayoutText');
  const uc5PipelineStatusEl = document.getElementById('uc5-pipelineStatus');
  const uc5SavedPreviewSelect = document.getElementById('uc5-savedPreviewSelect');
  const uc5DeleteSavedPreviewBtn = document.getElementById('uc5-deleteSavedPreviewBtn');

  function setUC5LoadingCopy(stage) {
    if (!uc5LoadingText || !uc5LoadingSubtext) return;

    const copies = {
      ingestion: {
        text: '교육 원문을 인덱싱하는 중입니다...',
        subtext: 'PDF를 Foundry vector store에 업로드하고 file_search용 검색 인덱스를 준비합니다.'
      },
      planning: {
        text: '교육 기획안을 작성하는 중입니다...',
        subtext: '업로드한 PDF를 분석해 교육 흐름, 권장 구성 방식, 화면 수를 제안합니다.'
      },
      blueprint: {
        text: '화면 구성을 설계하는 중입니다...',
        subtext: '승인된 기획안을 바탕으로 각 화면의 역할, 배치 영역, 사용 가능한 학습 컴포넌트를 정합니다.'
      },
      payload: {
        text: '학습 화면 내용을 작성하는 중입니다...',
        subtext: '원문 근거를 화면별로 확인하며 실제 카드, 체크리스트, 퀴즈 문구를 채웁니다.'
      },
      assembly: {
        text: '교육 미리보기를 조립하는 중입니다...',
        subtext: '화면 설계와 학습 문구를 병합해 브라우저 렌더링용 교육 모듈을 구성합니다.'
      },
      final_render: {
        text: '교육 미리보기를 조립하는 중입니다...',
        subtext: '승인된 기획안과 원문 기반 학습 문구를 합쳐 최종 미리보기를 생성합니다.'
      }
    };

    const copy = copies[stage] || copies.planning;
    uc5LoadingText.textContent = copy.text;
    uc5LoadingSubtext.textContent = copy.subtext;
  }

  function setUC5PipelineStatus(activeStep = 'idle', state = 'idle') {
    uc5PipelineStatus = activeStep;
    if (!uc5PipelineStatusEl) return;

    const order = ['planning', 'blueprint', 'payload', 'render'];
    const activeIndex = order.indexOf(activeStep);

    uc5PipelineStatusEl.querySelectorAll('[data-uc5-step]').forEach((item) => {
      const step = item.getAttribute('data-uc5-step');
      const index = order.indexOf(step);
      item.classList.remove('is-idle', 'is-active', 'is-done', 'is-error');

      if (state === 'error' && step === activeStep) {
        item.classList.add('is-error');
      } else if (activeIndex >= 0 && index < activeIndex) {
        item.classList.add('is-done');
      } else if (step === activeStep && state === 'active') {
        item.classList.add('is-active');
      } else if (step === activeStep && state === 'done') {
        item.classList.add('is-done');
      } else {
        item.classList.add('is-idle');
      }
    });
  }

  function fitUC5PreviewChassis() {
    if (!viewportCanvas || !chassisWrapper) return;

    if (uc5PreviewFitRaf) {
      cancelAnimationFrame(uc5PreviewFitRaf);
      uc5PreviewFitRaf = null;
    }

    uc5PreviewFitRaf = requestAnimationFrame(() => {
      uc5PreviewFitRaf = null;

      const canvasRect = viewportCanvas.getBoundingClientRect();
      if (!canvasRect.width || !canvasRect.height) return;

      const styles = window.getComputedStyle(viewportCanvas);
      const paddingX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
      const paddingY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
      const availableWidth = Math.max(0, canvasRect.width - paddingX);
      const availableHeight = Math.max(0, canvasRect.height - paddingY);
      if (!availableWidth || !availableHeight) return;

      const isMobileFrame = viewportCanvas.classList.contains('uc5-mobile-frame');

      if (!isMobileFrame) {
        // Desktop preview should fill the available preview work area.
        // The final lesson content itself can scroll inside the chassis when needed.
        chassisWrapper.style.width = `${Math.max(0, Math.floor(availableWidth))}px`;
        chassisWrapper.style.height = `${Math.max(0, Math.floor(availableHeight))}px`;
        return;
      }

      const ratio = 9 / 19.5;
      const safetyGap = 0;
      let targetWidth = Math.min(availableWidth, availableHeight * ratio) - safetyGap;
      let targetHeight = targetWidth / ratio;

      if (targetHeight > availableHeight - safetyGap) {
        targetHeight = availableHeight - safetyGap;
        targetWidth = targetHeight * ratio;
      }

      chassisWrapper.style.width = `${Math.max(0, Math.floor(targetWidth))}px`;
      chassisWrapper.style.height = `${Math.max(0, Math.floor(targetHeight))}px`;
    });
  }

  function scheduleUC5PreviewFit(delayMs = 0) {
    if (delayMs > 0) {
      window.setTimeout(fitUC5PreviewChassis, delayMs);
      return;
    }

    fitUC5PreviewChassis();
  }

  function hashUC5PreviewKey(input) {
    const text = String(input || 'uc5-preview');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function sanitizeUC5PreviewIdPart(value) {
    return String(value || 'preview')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'preview';
  }

  function getUC5SavedPreviewFileName(renderPlan = uc5RenderPlanData) {
    const fromRenderPlan = renderPlan?.source_lineage?.source_file_name;
    const fromSourceHandle = uc5SourceHandleData?.file_profile?.file_name;
    const fromUpload = uc5UploadedFile?.name;
    return String(fromRenderPlan || fromSourceHandle || fromUpload || 'UC5 Preview').trim() || 'UC5 Preview';
  }

  function formatUC5SavedPreviewDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (_) {
      return '';
    }
  }

  function setUC5SavedPreviewSelectorPlaceholder(text, disabled = true) {
    if (!uc5SavedPreviewSelect) return;
    uc5SavedPreviewSelect.textContent = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = text;
    uc5SavedPreviewSelect.appendChild(option);
    uc5SavedPreviewSelect.value = '';
    uc5SavedPreviewSelect.disabled = Boolean(disabled);
    if (uc5DeleteSavedPreviewBtn) {
      uc5DeleteSavedPreviewBtn.disabled = true;
      uc5DeleteSavedPreviewBtn.title = '삭제할 저장 Preview가 없습니다';
    }
  }

  function renderUC5SavedPreviewSelector(selectedId = uc5SavedPreviewActiveId) {
    if (!uc5SavedPreviewSelect) return;

    if (uc5SavedPreviewStatus === 'loading') {
      setUC5SavedPreviewSelectorPlaceholder('저장된 Preview 불러오는 중...', true);
      return;
    }

    if (uc5SavedPreviewStatus === 'unavailable') {
      setUC5SavedPreviewSelectorPlaceholder('Firebase 저장소 연결 필요', true);
      return;
    }

    uc5SavedPreviewSelect.textContent = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = uc5SavedPreviewRecords.length ? '저장된 최종 Preview 선택' : '저장된 최종 Preview 없음';
    uc5SavedPreviewSelect.appendChild(placeholder);

    for (const record of uc5SavedPreviewRecords) {
      if (!record?.id) continue;
      const option = document.createElement('option');
      option.value = record.id;
      const dateText = formatUC5SavedPreviewDate(record.updated_at_iso || record.saved_at || record.created_at_iso);
      const shellText = record.macro_shell_id || record.template_id || 'UC5';
      option.textContent = `${record.pdf_file_name || 'UC5 Preview'}${dateText ? ` · ${dateText}` : ''} · ${shellText}`;
      uc5SavedPreviewSelect.appendChild(option);
    }

    const selectedExists = uc5SavedPreviewRecords.some(record => record.id === selectedId);
    uc5SavedPreviewSelect.disabled = false;
    uc5SavedPreviewSelect.value = selectedExists ? selectedId : '';
    uc5SavedPreviewActiveId = selectedExists ? selectedId : '';

    if (uc5DeleteSavedPreviewBtn) {
      uc5DeleteSavedPreviewBtn.disabled = !selectedExists;
      uc5DeleteSavedPreviewBtn.title = selectedExists ? '선택한 저장 Preview 삭제' : '삭제할 저장 Preview가 없습니다';
    }
  }

  async function getUC5FirebaseClient() {
    if (uc5FirebaseClientPromise) return uc5FirebaseClientPromise;

    uc5FirebaseClientPromise = (async () => {
      const initResponse = await fetch('/__/firebase/init.json', { cache: 'no-store' });
      if (!initResponse.ok) {
        throw new Error('Firebase Hosting init.json을 찾지 못했습니다. Firebase 배포 URL에서만 저장 목록을 사용할 수 있습니다.');
      }

      const firebaseConfig = await initResponse.json();
      const [appMod, firestoreMod] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${UC5_FIREBASE_SDK_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${UC5_FIREBASE_SDK_VERSION}/firebase-firestore.js`)
      ]);

      const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
      const db = firestoreMod.getFirestore(app);
      return { app, db, firestore: firestoreMod };
    })();

    return uc5FirebaseClientPromise;
  }

  function buildUC5SavedPreviewRecordId(pdfFileName) {
    const safeName = sanitizeUC5PreviewIdPart(pdfFileName.replace(/\.[a-zA-Z0-9]+$/, ''));
    return `${safeName}_${hashUC5PreviewKey(pdfFileName)}`;
  }

  function chunkUC5StringByUtf8Bytes(text, maxBytes = UC5_SAVED_PREVIEW_CHUNK_TARGET_BYTES) {
    const encoder = new TextEncoder();
    const chunks = [];
    let buffer = '';
    let bufferBytes = 0;

    for (const char of String(text || '')) {
      const charBytes = encoder.encode(char).length;
      if (buffer && bufferBytes + charBytes > maxBytes) {
        chunks.push({ text: buffer, bytes: bufferBytes });
        buffer = '';
        bufferBytes = 0;
      }
      buffer += char;
      bufferBytes += charBytes;
    }

    if (buffer || !chunks.length) {
      chunks.push({ text: buffer, bytes: bufferBytes });
    }

    return chunks;
  }

  async function deleteUC5SavedPreviewChunks(client, previewDoc) {
    const { collection, getDocs, deleteDoc } = client.firestore;
    const chunksRef = collection(previewDoc, UC5_SAVED_PREVIEW_CHUNK_COLLECTION);
    const snapshot = await getDocs(chunksRef);
    for (const item of snapshot.docs) {
      await deleteDoc(item.ref);
    }
  }

  async function refreshUC5SavedPreviewSelectorFromFirebase(selectedId = uc5SavedPreviewActiveId) {
    if (!uc5SavedPreviewSelect) return;
    uc5SavedPreviewStatus = 'loading';
    renderUC5SavedPreviewSelector(selectedId);

    try {
      const client = await getUC5FirebaseClient();
      const { collection, getDocs, query, orderBy, limit } = client.firestore;
      const previewsQuery = query(
        collection(client.db, UC5_SAVED_PREVIEW_COLLECTION),
        orderBy('updated_at_ms', 'desc'),
        limit(UC5_SAVED_PREVIEW_LIMIT)
      );
      const snapshot = await getDocs(previewsQuery);
      uc5SavedPreviewRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      uc5SavedPreviewStatus = 'ready';
      renderUC5SavedPreviewSelector(selectedId);
    } catch (err) {
      console.warn('[UC5] Firestore 저장 Preview 목록을 읽지 못했습니다.', err);
      uc5SavedPreviewRecords = [];
      uc5SavedPreviewStatus = 'unavailable';
      renderUC5SavedPreviewSelector('');
    }
  }

  function buildUC5FinalHtmlScreenFromPlan(normalizedPlan, screenIndex) {
    const screens = Array.isArray(normalizedPlan?.screens) ? normalizedPlan.screens : [];
    const screenCount = Math.max(1, screens.length);
    const safeIndex = Math.min(Math.max(Number(screenIndex) || 0, 0), screenCount - 1);
    const screen = screens[safeIndex] || {};
    const lesson = normalizedPlan?.lesson_meta || {};
    const shell = lesson.macro_shell_id || normalizedPlan?.layout_contract?.macro_shell_id || 'learning_canvas';
    const progressPercent = Math.round(((safeIndex + 1) / screenCount) * 100);
    const sections = Array.isArray(screen.sections) ? screen.sections : [];

    return `
      <div class="uc5-inner-scroll-container uc5-rp-scroll uc5-fade-in-up">
        <article class="uc5-render-plan-shell" data-uc5-rp-shell="${escapeHtml(shell)}">
          <header class="uc5-rp-screen-header">
            <div>
              <div class="uc5-rp-kicker">${escapeHtml(lesson.lesson_title || 'UC5 Learning Module')}</div>
              <h2>${escapeHtml(screen.screen_title || `화면 ${safeIndex + 1}`)}</h2>
              <p>${escapeHtml(screen.learning_goal || screen.narrative_function || '')}</p>
            </div>
            <div class="uc5-rp-progress-card">
              <span>${safeIndex + 1} / ${screenCount}</span>
              <strong>${progressPercent}%</strong>
            </div>
          </header>

          <div class="uc5-rp-progress-track" aria-hidden="true">
            <span style="width: ${progressPercent}%"></span>
          </div>

          <section class="uc5-rp-screen-grid">
            ${sections.map(section => renderUC5V2Section(section)).join('') || `
              <div class="uc5-rp-section uc5-rp-slot-main">
                ${renderUC5V2FallbackSection({ component_type: 'empty_screen', component_payload: { title: '표시할 섹션이 없습니다.', summary: '', body: '', items: [] } })}
              </div>
            `}
          </section>
        </article>
      </div>
      <div class="uc5-inner-pagination uc5-rp-pagination">
        <button class="uc5-inner-nav-btn uc5-v2-prev-btn" ${safeIndex === 0 ? 'disabled' : ''}>Previous</button>
        <span class="uc5-inner-page-indicator">화면 ${safeIndex + 1} / ${screenCount}</span>
        <button class="uc5-inner-nav-btn uc5-v2-next-btn">${safeIndex === screenCount - 1 ? 'Complete' : 'Next'}</button>
      </div>
    `;
  }

  function buildUC5FinalHtmlPreviewSnapshot(renderPlan) {
    const normalizedPlan = normalizeUC5RenderPlan(renderPlan);
    const pdfFileName = getUC5SavedPreviewFileName(normalizedPlan);
    const screens = Array.isArray(normalizedPlan.screens) ? normalizedPlan.screens : [];
    const lesson = normalizedPlan.lesson_meta || {};
    const layout = normalizedPlan.layout_contract || {};

    return {
      saved_preview_html_version: 'uc5_saved_final_preview_html.v1',
      status: 'ready_for_html_preview',
      pdf_file_name: pdfFileName,
      created_from: 'frontend_final_html_after_r3d_merge',
      saved_at_iso: new Date().toISOString(),
      lesson_meta: {
        lesson_title: lesson.lesson_title || '',
        lesson_subtitle: lesson.lesson_subtitle || '',
        learner_promise: lesson.learner_promise || '',
        completion_goal: lesson.completion_goal || '',
        macro_shell_id: lesson.macro_shell_id || layout.macro_shell_id || '',
        template_id: lesson.template_id || layout.template_id || '',
        screen_count: Number(layout.screen_count || screens.length || 0),
        language: lesson.language || 'ko'
      },
      preview_runtime: {
        renderer: 'uc5_frontend_static_html_snapshot',
        source_kind: 'final_html_only',
        requires_n8n: false,
        stores_pdf: false,
        stores_source_handle: false,
        stores_render_plan: false
      },
      screens: screens.map((screen, index) => ({
        screen_index: Number(screen.screen_index || index + 1),
        screen_title: screen.screen_title || `화면 ${index + 1}`,
        html: buildUC5FinalHtmlScreenFromPlan(normalizedPlan, index)
      }))
    };
  }

  async function saveUC5CompletedPreview(renderPlan) {
    const htmlPreview = buildUC5FinalHtmlPreviewSnapshot(renderPlan);
    const pdfFileName = htmlPreview.pdf_file_name || 'UC5 Preview';
    const id = buildUC5SavedPreviewRecordId(pdfFileName);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    htmlPreview.saved_at_iso = nowIso;
    const htmlPreviewJson = JSON.stringify(htmlPreview);
    const htmlPreviewBytes = new TextEncoder().encode(htmlPreviewJson).length;
    const chunks = chunkUC5StringByUtf8Bytes(htmlPreviewJson);
    const lesson = htmlPreview.lesson_meta || {};

    const metadata = {
      saved_preview_version: 'uc5_saved_final_preview_html.firestore_chunks.v1',
      id,
      pdf_file_name: pdfFileName,
      lesson_title: lesson.lesson_title || '',
      lesson_subtitle: lesson.lesson_subtitle || '',
      template_id: lesson.template_id || '',
      macro_shell_id: lesson.macro_shell_id || '',
      screen_count: Number(lesson.screen_count || htmlPreview.screens?.length || 0),
      saved_payload_kind: 'final_html_snapshot',
      saved_payload_version: htmlPreview.saved_preview_html_version,
      source_kind: 'final_html_only',
      stores_pdf: false,
      stores_source_handle: false,
      stores_render_plan: false,
      updated_at_iso: nowIso,
      updated_at_ms: nowMs,
      storage_backend: 'firestore_chunked_documents',
      chunk_collection: UC5_SAVED_PREVIEW_CHUNK_COLLECTION,
      chunk_count: chunks.length,
      chunk_target_bytes: UC5_SAVED_PREVIEW_CHUNK_TARGET_BYTES,
      html_preview_bytes: htmlPreviewBytes
    };

    const client = await getUC5FirebaseClient();
    const previewDoc = client.firestore.doc(client.db, UC5_SAVED_PREVIEW_COLLECTION, id);
    const chunksRef = client.firestore.collection(previewDoc, UC5_SAVED_PREVIEW_CHUNK_COLLECTION);

    await deleteUC5SavedPreviewChunks(client, previewDoc);

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const chunkDoc = client.firestore.doc(chunksRef, String(index).padStart(4, '0'));
      await client.firestore.setDoc(chunkDoc, {
        order: index,
        data: chunk.text,
        bytes: chunk.bytes,
        updated_at_ms: nowMs
      }, { merge: false });
    }

    await client.firestore.setDoc(previewDoc, metadata, { merge: false });

    const record = { ...metadata, id };
    uc5SavedPreviewActiveId = id;
    await refreshUC5SavedPreviewSelectorFromFirebase(id);
    return record;
  }

  async function fetchUC5SavedPreviewHtmlSnapshot(record) {
    const client = await getUC5FirebaseClient();
    const previewDoc = client.firestore.doc(client.db, UC5_SAVED_PREVIEW_COLLECTION, record.id);
    const chunksRef = client.firestore.collection(previewDoc, UC5_SAVED_PREVIEW_CHUNK_COLLECTION);
    const chunksQuery = client.firestore.query(chunksRef, client.firestore.orderBy('order', 'asc'));
    const snapshot = await client.firestore.getDocs(chunksQuery);

    if (snapshot.empty) {
      throw new Error('저장된 Preview HTML chunk가 없습니다. 다시 생성 후 저장해 주세요.');
    }

    const jsonText = snapshot.docs
      .map((item) => item.data()?.data || '')
      .join('');

    try {
      const htmlPreview = JSON.parse(jsonText);
      if (htmlPreview?.saved_preview_html_version !== 'uc5_saved_final_preview_html.v1') {
        throw new Error('saved_preview_html_version_invalid');
      }
      return htmlPreview;
    } catch (err) {
      throw new Error('저장 Preview HTML을 복원하지 못했습니다. 저장본을 삭제하고 다시 생성해 주세요.');
    }
  }

  function renderUC5SavedHtmlCurrentScreen() {
    if (!uc5SavedHtmlPreviewData || !previewStage) return;
    const screens = Array.isArray(uc5SavedHtmlPreviewData.screens) ? uc5SavedHtmlPreviewData.screens : [];
    const screenCount = screens.length;
    if (!screenCount) {
      previewStage.innerHTML = '<div class="uc5-empty-preview">저장된 Preview 화면이 비어 있습니다.</div>';
      return;
    }

    uc5RenderPlanScreenIndex = Math.min(Math.max(uc5RenderPlanScreenIndex, 0), screenCount - 1);
    const screen = screens[uc5RenderPlanScreenIndex];

    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (paginationFooter) paginationFooter.style.display = 'none';
    if (activeLayoutText) {
      const shell = uc5SavedHtmlPreviewData.lesson_meta?.macro_shell_id || uc5SavedHtmlPreviewData.lesson_meta?.template_id || 'UC5';
      activeLayoutText.textContent = `저장 Preview 불러옴 · ${shell}`;
    }

    previewStage.innerHTML = screen.html || '<div class="uc5-empty-preview">저장된 Preview HTML이 없습니다.</div>';
    scheduleUC5PreviewFit();
  }

  function renderUC5SavedHtmlPreview(htmlPreview, options = {}) {
    const { savedRecord = null } = options || {};
    uc5PlanningDraftData = null;
    uc5TemplateBoundBlueprintData = null;
    uc5SlotPayloadSeedData = null;
    uc5SourceCoverageSummaryData = null;
    uc5SlidesData = null;
    uc5RenderPlanData = null;
    uc5SavedHtmlPreviewData = htmlPreview && typeof htmlPreview === 'object' ? htmlPreview : null;
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};

    setUC5PipelineStatus('render', 'done');
    renderUC5SavedHtmlCurrentScreen();

    if (savedRecord && activeLayoutText) {
      activeLayoutText.textContent = `저장 Preview 불러옴 · ${savedRecord.macro_shell_id || savedRecord.template_id || htmlPreview?.lesson_meta?.macro_shell_id || 'UC5'}`;
    }
  }

  async function loadUC5SavedPreview(recordId) {
    if (!recordId) return;

    try {
      const cached = uc5SavedPreviewRecords.find(item => item.id === recordId);
      const client = await getUC5FirebaseClient();
      const previewDoc = client.firestore.doc(client.db, UC5_SAVED_PREVIEW_COLLECTION, recordId);
      const snapshot = await client.firestore.getDoc(previewDoc);
      const record = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : cached;
      if (!record) throw new Error('선택한 저장 Preview를 찾지 못했습니다.');

      const htmlPreview = await fetchUC5SavedPreviewHtmlSnapshot(record);
      uc5SavedPreviewActiveId = record.id;
      renderUC5SavedHtmlPreview(htmlPreview, { savedRecord: record });
      renderUC5SavedPreviewSelector(record.id);
    } catch (err) {
      console.error('[UC5] 저장 Preview 로드 실패', err);
      alert(err.message || '저장 Preview를 불러오지 못했습니다.');
      renderUC5SavedPreviewSelector(uc5SavedPreviewActiveId);
    }
  }

  async function deleteUC5SavedPreview(recordId) {
    const record = uc5SavedPreviewRecords.find(item => item.id === recordId);
    if (!record) return;

    const ok = window.confirm(`저장된 Preview를 삭제할까요?\n${record.pdf_file_name || 'UC5 Preview'}`);
    if (!ok) return;

    try {
      if (uc5DeleteSavedPreviewBtn) uc5DeleteSavedPreviewBtn.disabled = true;
      const client = await getUC5FirebaseClient();
      const previewDoc = client.firestore.doc(client.db, UC5_SAVED_PREVIEW_COLLECTION, recordId);
      await deleteUC5SavedPreviewChunks(client, previewDoc);
      await client.firestore.deleteDoc(previewDoc);
      if (uc5SavedPreviewActiveId === recordId) uc5SavedPreviewActiveId = '';
      if (uc5SavedHtmlPreviewData && uc5SavedPreviewActiveId === '') uc5SavedHtmlPreviewData = null;
      await refreshUC5SavedPreviewSelectorFromFirebase('');
    } catch (err) {
      console.error('[UC5] 저장 Preview 삭제 실패', err);
      alert(err.message || '저장 Preview 삭제에 실패했습니다.');
      renderUC5SavedPreviewSelector(uc5SavedPreviewActiveId);
    }
  }


  function getUC5SelectedMacroShell() {
    const checked = Array.from(macroShellInputs).find(input => input.checked);
    return checked?.value || uc5SelectedMacroShell || 'auto';
  }

  function setUC5SelectedMacroShell(value) {
    uc5SelectedMacroShell = UC5_MACRO_SHELL_META[value] ? value : 'auto';
    const meta = UC5_MACRO_SHELL_META[uc5SelectedMacroShell] || UC5_MACRO_SHELL_META.auto;
    uc5SelectedTemplate = meta.legacyTemplateId || 'template_matrix';

    if (activeLayoutText) {
      activeLayoutText.textContent = meta.activeText || meta.label;
    }

    updateUC5LearningConditionState();
    validateUC5RunBtn();
  }

  function getUC5ConditionControls() {
    return [
      uc5PlanningMode,
      uc5ContentDensity,
      uc5TargetAudience,
      uc5TargetDuration,
      uc5InteractionLevel,
      uc5GamificationLevel,
      uc5AdminNotes
    ].filter(Boolean);
  }

  function setUC5ConditionControlsDisabled(disabled) {
    getUC5ConditionControls().forEach((control) => {
      control.disabled = Boolean(disabled);
    });

    if (uc5LearningConditionsBox) {
      uc5LearningConditionsBox.classList.toggle('is-disabled', Boolean(disabled));
    }
  }

  function updateUC5LearningConditionState() {
    const selected = getUC5SelectedMacroShell();
    const isAiRecommend = selected === 'auto';
    const hasAiRecommendation = Boolean(uc5PlanningDraftData && uc5CurrentUiSelectionData);
    const shouldDisableConditions = isAiRecommend && !hasAiRecommendation;

    setUC5ConditionControlsDisabled(shouldDisableConditions);

    if (uc5SelectionModeChip) {
      if (hasAiRecommendation) {
        uc5SelectionModeChip.textContent = 'AI 추천 적용됨';
      } else if (isAiRecommend) {
        uc5SelectionModeChip.textContent = 'AI 추천 대기';
      } else {
        uc5SelectionModeChip.textContent = '직접 선택';
      }
    }

    if (uc5ConditionStateChip) {
      uc5ConditionStateChip.textContent = shouldDisableConditions
        ? 'AI 추천 후 편집 가능'
        : '편집 가능';
    }

    if (uc5ActionHelper) {
      if (!uc5UploadedFile) {
        uc5ActionHelper.textContent = '교육 원문 PDF를 먼저 업로드하세요.';
      } else if (isAiRecommend && !hasAiRecommendation) {
        uc5ActionHelper.textContent = 'AI가 추천 카드의 “추천 받기”를 먼저 실행하세요.';
      } else if (hasAiRecommendation && !uc5TemplateBoundBlueprintData) {
        uc5ActionHelper.textContent = 'AI 추천값을 확인한 뒤 교육 기획안을 만들 수 있습니다.';
      } else if (uc5TemplateBoundBlueprintData) {
        uc5ActionHelper.textContent = '화면 설계안을 검토한 뒤 최종 미리보기를 만들 수 있습니다.';
      } else {
        uc5ActionHelper.textContent = '선택한 구성으로 교육 화면 설계안을 만듭니다.';
      }
    }
  }

  function getUC5ScreenCountFromDensity(density) {
    if (density === 'micro') return 6;
    if (density === 'extended') return 10;
    return 8;
  }

  function getUC5ScreenCountRangeFromDensity(density) {
    if (density === 'micro') return '5-6';
    if (density === 'extended') return '10-12';
    return '7-9';
  }

  function getUC5DensityFromScreenCount(screenCount) {
    const count = Number(screenCount || 8);
    if (count <= 6) return 'micro';
    if (count >= 10) return 'extended';
    return 'standard';
  }

  function getUC5CurrentUiSelectionFromControls() {
    const selectedMacroShell = getUC5SelectedMacroShell();
    const shell = selectedMacroShell === 'auto'
      ? (uc5CurrentUiSelectionData?.macro_shell_id || 'learning_canvas')
      : selectedMacroShell;
    const meta = UC5_MACRO_SHELL_META[shell] || UC5_MACRO_SHELL_META.learning_canvas;
    const density = getUC5FieldValue(uc5ContentDensity, 'standard');
    const screenCount = getUC5ScreenCountFromDensity(density);

    return {
      narrative_choice: shell,
      planning_input_mode: selectedMacroShell === 'auto' ? 'ai_recommend_then_review' : 'manual_template',
      template_id: meta.templateId || 'learning_canvas.core_concept_flow',
      macro_shell_id: shell,
      screen_count: screenCount,
      screen_count_range: getUC5ScreenCountRangeFromDensity(density),
      content_density: density,
      interaction_level: getUC5FieldValue(uc5InteractionLevel, 'medium'),
      gamification_level: getUC5FieldValue(uc5GamificationLevel, 'medium'),
      target_duration_minutes: Number(getUC5FieldValue(uc5TargetDuration, '7')),
      target_audience: getUC5FieldValue(uc5TargetAudience, 'general_employee'),
      tone: 'professional_motivational',
      language: 'ko'
    };
  }

  function applyUC5SelectionToControls(selection) {
    if (!selection || typeof selection !== 'object') return;

    const macroShell = selection.macro_shell_id || selection.narrative_choice;
    if (macroShell && UC5_MACRO_SHELL_META[macroShell]) {
      macroShellInputs.forEach((input) => {
        input.checked = input.value === macroShell;
      });
      uc5SelectedMacroShell = macroShell;
      uc5SelectedTemplate = UC5_MACRO_SHELL_META[macroShell].legacyTemplateId || 'template_matrix';
    }

    if (uc5PlanningMode) uc5PlanningMode.value = 'manual_shell';
    if (uc5ContentDensity) uc5ContentDensity.value = selection.content_density || getUC5DensityFromScreenCount(selection.screen_count);
    if (uc5TargetAudience) uc5TargetAudience.value = selection.target_audience || 'general_employee';
    if (uc5TargetDuration) uc5TargetDuration.value = String(selection.target_duration_minutes || 7);
    if (uc5InteractionLevel) uc5InteractionLevel.value = selection.interaction_level || 'medium';
    if (uc5GamificationLevel) uc5GamificationLevel.value = selection.gamification_level || 'medium';

    updateUC5LearningConditionState();
  }

  function buildUC5ManualPlanningDraft(selection) {
    const selected = selection || getUC5CurrentUiSelectionFromControls();
    const meta = UC5_MACRO_SHELL_META[selected.macro_shell_id] || UC5_MACRO_SHELL_META.learning_canvas;
    const screenCount = Number(selected.screen_count || 8);

    return {
      planning_stage: 'manual_admin_selection',
      planning_version: 'uc5_manual_admin_selection.v1',
      planning_status: 'approved_by_admin_input',
      source_content_profile: {
        detected_primary_structure: 'mixed',
        detected_secondary_structures: [],
        content_density_assessment: selected.content_density || 'standard',
        document_signals: ['관리자 직접 선택', meta.label || selected.macro_shell_id, '업로드 PDF 기반'],
        learning_opportunity: '관리자가 선택한 교육 구성 방식과 학습 조건을 기준으로 화면 설계안을 생성합니다.',
        risks_for_planning: []
      },
      recommended_ui_selection: selected,
      narrative_preview: {
        lesson_title: '관리자 지정 교육 과정',
        lesson_subtitle: `${meta.label || selected.macro_shell_id} 기반 교육 구성`,
        learner_promise: '업로드한 원문을 바탕으로 핵심 내용을 이해하고 업무에 적용합니다.',
        completion_goal: '학습자가 주요 개념과 실천 항목을 확인하고 자신의 업무에 연결합니다.',
        narrative_arc: Array.from({ length: screenCount }, (_, index) => `화면 ${index + 1} 학습 흐름`),
        screen_outline: []
      },
      recommendation_rationale: {
        decision_confidence: 'high',
        primary_reason: '관리자가 교육 구성 방식을 직접 선택했습니다.',
        source_signals: ['관리자 직접 선택', '학습 조건 직접 지정', 'PDF 원문 업로드'],
        alternatives: []
      },
      admin_review_items: [],
      next_step_contract: {
        next_workflow: 'UC5 / 02 Template-bound Blueprint Planner',
        next_workflow_stage: 'template_bound_blueprint_planning',
        component_selection_status: 'deferred_to_template_bound_blueprint',
        slot_assignment_status: 'deferred_to_template_bound_blueprint',
        render_plan_status: 'not_started',
        use_current_ui_selection_as_source_of_truth: true,
        handoff_instruction: '관리자 직접 선택값을 current_ui_selection으로 사용하여 화면 설계안을 생성합니다.'
      }
    };
  }

  function getUC5FieldValue(el, fallback) {
    if (!el) return fallback;
    const value = String(el.value ?? '').trim();
    return value || fallback;
  }

  function getUC5PlanningContext() {
    const selectedMacroShell = getUC5SelectedMacroShell();

    return {
      planning_mode: getUC5FieldValue(uc5PlanningMode, 'ai_recommend_shell'),
      preferred_macro_shell_id: selectedMacroShell,
      content_density: getUC5FieldValue(uc5ContentDensity, 'standard'),
      target_audience: getUC5FieldValue(uc5TargetAudience, 'general_employee'),
      target_duration_minutes: Number(getUC5FieldValue(uc5TargetDuration, '7')),
      tone: 'professional_motivational',
      language: 'ko',
      form_factors: ['desktop', 'mobile'],
      interaction_level: getUC5FieldValue(uc5InteractionLevel, 'medium'),
      gamification_level: getUC5FieldValue(uc5GamificationLevel, 'medium'),
      output_stage: 'content_planning_draft',
      admin_notes: getUC5FieldValue(uc5AdminNotes, '')
    };
  }

  function getUC5FileExtension(fileName) {
    const matched = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return matched ? matched[1] : '';
  }

  function getUC5FileProfile(file) {
    if (!file) return null;

    const fileExtension = getUC5FileExtension(file.name);
    const fileType = file.type || (fileExtension === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    return {
      file_name: file.name || '',
      file_size_bytes: file.size || 0,
      file_size_mb: Number(((file.size || 0) / 1024 / 1024).toFixed(3)),
      file_type: fileType,
      file_extension: fileExtension,
      last_modified: file.lastModified || null
    };
  }

  function buildUC5UploadedFileKey(file) {
    if (!file) return '';
    return [file.name || '', file.size || 0, file.lastModified || 0].join('::');
  }

  function resetUC5SourceHandleState() {
    uc5SourceHandleData = null;
    uc5SourceHandleFileKey = '';
  }

  function getUC5SourceHandleFromResponse(data) {
    const payload = getUC5ResponsePayload(data);
    return payload.source_handle || data?.source_handle || null;
  }

  function appendUC5SourceHandleToFormData(formData, sourceHandle) {
    if (!sourceHandle || typeof sourceHandle !== 'object') {
      throw new Error('W00 source_handle이 없습니다. 원문 인덱싱부터 다시 실행해 주세요.');
    }
    formData.append('source_handle', JSON.stringify(sourceHandle));
    if (sourceHandle.vector_store_id) formData.append('vector_store_id', sourceHandle.vector_store_id);
    if (sourceHandle.file_id) formData.append('file_id', sourceHandle.file_id);
    if (sourceHandle.batch_id) formData.append('batch_id', sourceHandle.batch_id);
  }

  function buildUC5SourceIngestionFormData() {
    if (!uc5UploadedFile) {
      throw new Error('교육 원문 PDF를 먼저 업로드해 주세요.');
    }

    const fileProfile = getUC5FileProfile(uc5UploadedFile);
    const batchStamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const batchId = `uc5_webapp_${batchStamp}`;

    const formData = new FormData();
    formData.append('request_type', 'uc5_source_ingestion');
    formData.append('workflow_version', 'uc5_r3c_cleanup_safe');
    formData.append('workflow_stage', 'source_ingestion');
    formData.append('batch_id', batchId);
    formData.append('request_id', batchId);
    formData.append('file_name', fileProfile.file_name);
    formData.append('file_type', fileProfile.file_type || 'application/pdf');
    formData.append('file_size_bytes', String(fileProfile.file_size_bytes || 0));
    formData.append('file_profile', JSON.stringify(fileProfile));
    formData.append('cleanup_mode', 'ttl_plus_explicit_cleanup');
    formData.append('cleanup_after_final_render', 'false');
    formData.append('upload_file_expires_after', 'false');
    formData.append('vector_store_expires_after_days', '3');
    formData.append('cleanup_delete_after_hours', '72');
    formData.append('file', uc5UploadedFile);
    return formData;
  }

  async function ensureUC5SourceHandle() {
    if (!uc5UploadedFile) {
      throw new Error('교육 원문 PDF를 먼저 업로드해 주세요.');
    }

    const fileKey = buildUC5UploadedFileKey(uc5UploadedFile);
    if (uc5SourceHandleData && uc5SourceHandleFileKey === fileKey) {
      return uc5SourceHandleData;
    }

    setUC5PipelineStatus('planning', 'active');
    setUC5LoadingCopy('ingestion');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    scheduleUC5PreviewFit();

    const ingestionResponse = await postUC5Workflow(
      CONFIG.UC5_W00_WEBHOOK,
      buildUC5SourceIngestionFormData(),
      '교육 원문 인덱싱 실패'
    );

    const ingestionPayload = getUC5ResponsePayload(ingestionResponse);
    const sourceHandle = getUC5SourceHandleFromResponse(ingestionResponse);
    if (ingestionPayload.status !== 'success' || !sourceHandle?.vector_store_id || !sourceHandle?.file_id) {
      throw new Error('교육 원문 인덱싱 결과 검증에 실패했습니다. W00 응답을 확인해 주세요.');
    }

    uc5SourceHandleData = sourceHandle;
    uc5SourceHandleFileKey = fileKey;
    console.info('[UC5 R3D] W00 source_handle ready', {
      vector_store_id: sourceHandle.vector_store_id,
      file_id: sourceHandle.file_id,
      batch_id: sourceHandle.batch_id
    });
    return uc5SourceHandleData;
  }


  const UC5_CANONICAL_REGISTRY_PATH = './uc5_component_registry.canonical.json';
  const UC5_EXPECTED_COMPONENT_REGISTRY_ID = 'uc5_component_registry';
  const UC5_EXPECTED_COMPONENT_REGISTRY_VERSION = 'uc5_component_registry.v1';
  const UC5_TEMPLATE_REGISTRY_BUNDLE_VERSION = 'uc5_template_registry_bundle.v1';
  const UC5_PAYLOAD_POLICY_BUNDLE_VERSION = 'uc5_payload_policy_bundle.v1';

  let uc5CanonicalRegistryCache = null;

  function isUC5PlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function normalizeUC5String(value, fallback = '') {
    if (value === undefined || value === null) return fallback;
    const normalized = String(value).trim();
    return normalized || fallback;
  }

  function normalizeUC5StringArray(values) {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values
      .map((value) => normalizeUC5String(value))
      .filter(Boolean)));
  }

  function cloneUC5Json(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function loadUC5CanonicalComponentRegistry() {
    if (uc5CanonicalRegistryCache) return uc5CanonicalRegistryCache;

    const response = await fetch(`${UC5_CANONICAL_REGISTRY_PATH}?v=${encodeURIComponent(APP_VERSION)}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`UC5 canonical registry 로드 실패 (${response.status}). uc5_component_registry.canonical.json 배포 상태를 확인하세요.`);
    }

    const registry = await response.json();
    if (!isUC5PlainObject(registry)) {
      throw new Error('UC5 canonical registry 응답이 JSON object가 아닙니다.');
    }

    if (registry.registry_id !== UC5_EXPECTED_COMPONENT_REGISTRY_ID) {
      throw new Error(`UC5 canonical registry_id 불일치: ${registry.registry_id || '(empty)'}`);
    }

    if (registry.registry_version !== UC5_EXPECTED_COMPONENT_REGISTRY_VERSION) {
      throw new Error(`UC5 canonical registry_version 불일치: ${registry.registry_version || '(empty)'}`);
    }

    if (!isUC5PlainObject(registry.templates) || !isUC5PlainObject(registry.components)) {
      throw new Error('UC5 canonical registry에 templates/components가 없습니다.');
    }

    uc5CanonicalRegistryCache = registry;
    return uc5CanonicalRegistryCache;
  }

  function getUC5TemplateRegistryRecord(registry, currentUiSelection) {
    const templateId = normalizeUC5String(currentUiSelection?.template_id);
    const macroShellId = normalizeUC5String(currentUiSelection?.macro_shell_id);
    const templateRecord = registry?.templates?.[templateId];

    if (!templateId) {
      throw new Error('UC5 current_ui_selection.template_id가 비어 있습니다.');
    }

    if (!macroShellId) {
      throw new Error('UC5 current_ui_selection.macro_shell_id가 비어 있습니다.');
    }

    if (!isUC5PlainObject(templateRecord)) {
      throw new Error(`UC5 canonical registry에 template_id가 없습니다: ${templateId}`);
    }

    if (normalizeUC5String(templateRecord.macro_shell_id) !== macroShellId) {
      throw new Error(`UC5 template/macro shell 불일치: ${templateId} / ${macroShellId}`);
    }

    return templateRecord;
  }

  function buildUC5TemplateRegistryBundleFromRegistry(currentUiSelection, registry) {
    const templateRecord = getUC5TemplateRegistryRecord(registry, currentUiSelection);
    const allowedComponents = normalizeUC5StringArray(templateRecord.allowed_components);
    const allowedComponentSet = new Set(allowedComponents);
    const componentCapabilities = {};

    if (allowedComponents.length < 1) {
      throw new Error(`UC5 template ${currentUiSelection.template_id}의 allowed_components가 비어 있습니다.`);
    }

    for (const componentType of allowedComponents) {
      const componentSpec = registry.components?.[componentType];
      if (!isUC5PlainObject(componentSpec)) {
        throw new Error(`UC5 component registry에 component가 없습니다: ${componentType}`);
      }

      componentCapabilities[componentType] = {
        component_type: componentType,
        renderer_name: normalizeUC5String(componentSpec.renderer_name || componentSpec.frontend_renderer_name || componentSpec.renderer_key || componentType),
        fallback_renderer_name: normalizeUC5String(componentSpec.fallback_renderer_name),
        renderer_key: normalizeUC5String(componentSpec.renderer_key || componentType),
        frontend_renderer_name: normalizeUC5String(componentSpec.frontend_renderer_name || componentSpec.renderer_name || componentSpec.renderer_key || componentType),
        allowed_slots: normalizeUC5StringArray(componentSpec.allowed_slots),
        required_payload_fields: normalizeUC5StringArray(componentSpec.required_payload_fields),
        preferred_for: normalizeUC5StringArray(componentSpec.preferred_for),
        allowed_primary_arrays: normalizeUC5StringArray(componentSpec.allowed_primary_arrays),
        preferred_primary_arrays: normalizeUC5StringArray(componentSpec.preferred_primary_arrays),
        min_primary_array_items: Number(componentSpec.min_primary_array_items || 0),
        text_budget_profile: normalizeUC5String(componentSpec.text_budget_profile || 'standard'),
        allowed_interactions: normalizeUC5StringArray(componentSpec.allowed_interactions),
        semantic_contract: normalizeUC5String(componentSpec.semantic_contract)
      };
    }

    for (const componentType of Object.keys(componentCapabilities)) {
      if (!allowedComponentSet.has(componentType)) {
        throw new Error(`UC5 unexpected component capability: ${componentType}`);
      }
    }

    return {
      bundle_version: UC5_TEMPLATE_REGISTRY_BUNDLE_VERSION,
      registry_id: registry.registry_id,
      registry_version: registry.registry_version,
      registry_source: 'frontend.uc5_component_registry.canonical.json',
      template_id: normalizeUC5String(currentUiSelection.template_id),
      macro_shell_id: normalizeUC5String(currentUiSelection.macro_shell_id),
      capability_manifest_version: normalizeUC5String(templateRecord.capability_manifest_version || 'uc5_renderer_capability_manifest.v1'),
      allowed_component_count: allowedComponents.length,
      allowed_components: allowedComponents,
      template_contract: {
        template_id: normalizeUC5String(currentUiSelection.template_id),
        macro_shell_id: normalizeUC5String(currentUiSelection.macro_shell_id),
        capability_manifest_version: normalizeUC5String(templateRecord.capability_manifest_version || 'uc5_renderer_capability_manifest.v1'),
        allowed_screen_roles: normalizeUC5StringArray(templateRecord.allowed_screen_roles),
        allowed_slots: normalizeUC5StringArray(templateRecord.allowed_slots),
        allowed_interactions: normalizeUC5StringArray(templateRecord.allowed_interactions),
        screen_role_component_preferences: isUC5PlainObject(templateRecord.screen_role_component_preferences)
          ? cloneUC5Json(templateRecord.screen_role_component_preferences)
          : {},
        slot_component_preferences: isUC5PlainObject(templateRecord.slot_component_preferences)
          ? cloneUC5Json(templateRecord.slot_component_preferences)
          : {},
        component_selection_guardrails: Array.isArray(templateRecord.component_selection_guardrails)
          ? normalizeUC5StringArray(templateRecord.component_selection_guardrails)
          : []
      },
      component_capabilities: componentCapabilities
    };
  }

  async function buildUC5TemplateRegistryBundle(currentUiSelection) {
    const registry = await loadUC5CanonicalComponentRegistry();
    return buildUC5TemplateRegistryBundleFromRegistry(currentUiSelection, registry);
  }

  function extractUC5SelectedComponentTypesFromBlueprint(templateBoundBlueprint) {
    const selected = [];
    const screens = Array.isArray(templateBoundBlueprint?.screen_blueprints)
      ? templateBoundBlueprint.screen_blueprints
      : [];

    for (const screen of screens) {
      const positions = Array.isArray(screen?.skeleton_positions) ? screen.skeleton_positions : [];
      for (const position of positions) {
        const componentType = normalizeUC5String(position?.selected_component_type);
        if (componentType) selected.push(componentType);
      }
    }

    return Array.from(new Set(selected)).sort((a, b) => a.localeCompare(b));
  }

  function buildUC5PayloadPolicyBundleFromRegistry(templateBoundBlueprint, registry) {
    const selectedComponentTypes = extractUC5SelectedComponentTypesFromBlueprint(templateBoundBlueprint);
    const payloadPolicies = {};

    if (selectedComponentTypes.length < 1) {
      throw new Error('W03 payload_policy_bundle 생성 실패: W02 blueprint의 selected_component_type이 비어 있습니다.');
    }

    for (const componentType of selectedComponentTypes) {
      const componentSpec = registry.components?.[componentType];
      if (!isUC5PlainObject(componentSpec)) {
        throw new Error(`W03 payload_policy_bundle 생성 실패: registry에 component가 없습니다: ${componentType}`);
      }

      const payloadPolicy = isUC5PlainObject(componentSpec.payload_policy)
        ? cloneUC5Json(componentSpec.payload_policy)
        : {};

      payloadPolicies[componentType] = {
        component_type: componentType,
        required_payload_fields: normalizeUC5StringArray(componentSpec.required_payload_fields),
        payload_policy: {
          required_non_empty_fields: normalizeUC5StringArray(payloadPolicy.required_non_empty_fields),
          one_of_non_empty_field_groups: Array.isArray(payloadPolicy.one_of_non_empty_field_groups)
            ? payloadPolicy.one_of_non_empty_field_groups
                .filter(Array.isArray)
                .map((group) => normalizeUC5StringArray(group))
                .filter((group) => group.length > 0)
            : [],
          allowed_primary_arrays: normalizeUC5StringArray(payloadPolicy.allowed_primary_arrays),
          preferred_primary_arrays: normalizeUC5StringArray(payloadPolicy.preferred_primary_arrays),
          min_primary_array_items: Number(payloadPolicy.min_primary_array_items || 0),
          quiz: Boolean(payloadPolicy.quiz),
          ...(Object.prototype.hasOwnProperty.call(payloadPolicy, 'requires_scenario_body')
            ? { requires_scenario_body: Boolean(payloadPolicy.requires_scenario_body) }
            : {}),
          ...(payloadPolicy.pb_semantic_role ? { pb_semantic_role: normalizeUC5String(payloadPolicy.pb_semantic_role) } : {}),
          ...(payloadPolicy.ds_semantic_role ? { ds_semantic_role: normalizeUC5String(payloadPolicy.ds_semantic_role) } : {})
        }
      };
    }

    return {
      bundle_version: UC5_PAYLOAD_POLICY_BUNDLE_VERSION,
      registry_id: registry.registry_id,
      registry_version: registry.registry_version,
      registry_source: 'frontend.uc5_component_registry.canonical.json',
      template_id: normalizeUC5String(templateBoundBlueprint?.selected_template?.template_id || templateBoundBlueprint?.current_ui_selection?.template_id),
      macro_shell_id: normalizeUC5String(templateBoundBlueprint?.selected_template?.macro_shell_id || templateBoundBlueprint?.current_ui_selection?.macro_shell_id),
      component_types: selectedComponentTypes,
      selected_component_count: selectedComponentTypes.length,
      payload_policies: payloadPolicies
    };
  }

  async function buildUC5PayloadPolicyBundle(templateBoundBlueprint) {
    const registry = await loadUC5CanonicalComponentRegistry();
    return buildUC5PayloadPolicyBundleFromRegistry(templateBoundBlueprint, registry);
  }

  async function buildUC5PlanningFormData() {
    if (!uc5UploadedFile) {
      throw new Error('교육 원문 PDF를 먼저 업로드해 주세요.');
    }

    const sourceHandle = await ensureUC5SourceHandle();
    const planningContext = getUC5PlanningContext();
    const fileProfile = sourceHandle.file_profile || getUC5FileProfile(uc5UploadedFile);
    const selectedMacroShell = planningContext.preferred_macro_shell_id || 'auto';
    const templateId = selectedMacroShell === 'auto'
      ? 'auto'
      : (UC5_MACRO_SHELL_META[selectedMacroShell] || UC5_MACRO_SHELL_META.auto).templateId || 'auto';

    const formData = new FormData();
    formData.append('request_type', 'uc5_ai_narrative_planning');
    formData.append('workflow_version', 'uc5_r3_responses');
    formData.append('workflow_stage', 'ai_narrative_planning');
    formData.append('workflow_mode', 'ai_narrative_planning');
    formData.append('narrative_choice', selectedMacroShell === 'auto' ? 'ai_recommend' : selectedMacroShell);
    formData.append('planning_input_mode', 'ai_recommend_then_review');
    formData.append('template_id', templateId);
    formData.append('macro_shell_id', selectedMacroShell);
    formData.append('file_name', fileProfile.file_name || '');
    formData.append('file_type', fileProfile.file_type || 'application/pdf');
    formData.append('file_size_bytes', String(fileProfile.file_size_bytes || 0));
    formData.append('planning_context', JSON.stringify(planningContext));
    formData.append('file_profile', JSON.stringify(fileProfile));
    appendUC5SourceHandleToFormData(formData, sourceHandle);

    return formData;
  }

  // 3. Helper: Validate & Unlock Run Button
  function validateUC5RunBtn() {
    if (!uc5RunBtn) return;

    const hasFile = Boolean(uc5UploadedFile);
    const selectedMode = getUC5SelectedMacroShell();
    const hasAiRecommendation = Boolean(uc5PlanningDraftData && uc5CurrentUiSelectionData);
    const canCreateBlueprint = hasFile && (selectedMode !== 'auto' || hasAiRecommendation);

    uc5RunBtn.disabled = !canCreateBlueprint;

    if (uc5AiRecommendBtn) {
      uc5AiRecommendBtn.disabled = !hasFile;
    }

    if (uc5RunBtn) {
      uc5RunBtn.textContent = uc5TemplateBoundBlueprintData
        ? '교육 기획안 다시 만들기'
        : '교육 기획안 만들기';
    }

    updateUC5LearningConditionState();
  }

  // 4. File Drop & Input Event Handling
  function handleUC5File(file) {
    if (!file) return;

    const allowedExtensions = /\.pdf$/i;
    if (!allowedExtensions.test(file.name)) {
      alert('현재 교육 원문 분석은 PDF 파일만 지원합니다. PDF 파일을 업로드해 주세요.');
      return;
    }


    uc5UploadedFile = file;
    uc5UploadedFileKey = buildUC5UploadedFileKey(file);
    resetUC5SourceHandleState();
    uc5PlanningDraftData = null;
    uc5CurrentUiSelectionData = null;
    uc5TemplateBoundBlueprintData = null;
    uc5SlotPayloadSeedData = null;
    uc5SourceCoverageSummaryData = null;
    uc5RenderPlanData = null;
    uc5SavedHtmlPreviewData = null;
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};
    uc5SavedPreviewActiveId = '';
    renderUC5SavedPreviewSelector('');

    if (uc5FileNameDisplay) {
      uc5FileNameDisplay.textContent = `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      uc5FileNameDisplay.style.display = 'block';
    }

    if (uc5UploadPrompt) {
      uc5UploadPrompt.style.display = 'none';
    }

    validateUC5RunBtn();
  }

  if (uc5Dropzone && uc5FileInput) {
    uc5Dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uc5Dropzone.classList.add('uc5-drag-highlight');
    });

    uc5Dropzone.addEventListener('dragleave', () => {
      uc5Dropzone.classList.remove('uc5-drag-highlight');
    });

    uc5Dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      uc5Dropzone.classList.remove('uc5-drag-highlight');
      const file = e.dataTransfer.files[0];
      if (file) handleUC5File(file);
    });

    uc5FileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleUC5File(file);
    });
  }

  // 5. Macro Shell Selection Handler
  macroShellInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const nextValue = e.target.value;
      const wasAuto = uc5SelectedMacroShell === 'auto';
      setUC5SelectedMacroShell(nextValue);

      if (nextValue !== 'auto') {
        uc5PlanningDraftData = null;
        uc5CurrentUiSelectionData = getUC5CurrentUiSelectionFromControls();
        uc5TemplateBoundBlueprintData = null;
        uc5SlotPayloadSeedData = null;
        uc5SourceCoverageSummaryData = null;
        uc5RenderPlanData = null;
        if (uc5PlanningMode) uc5PlanningMode.value = 'manual_shell';
        setUC5PipelineStatus('blueprint', 'idle');
        if (activeLayoutText) activeLayoutText.textContent = '직접 선택 · 교육 기획 대기';
      } else if (!wasAuto) {
        uc5PlanningDraftData = null;
        uc5CurrentUiSelectionData = null;
        uc5TemplateBoundBlueprintData = null;
        uc5SlotPayloadSeedData = null;
        uc5SourceCoverageSummaryData = null;
        uc5RenderPlanData = null;
        if (uc5PlanningMode) uc5PlanningMode.value = 'ai_recommend_shell';
        setUC5PipelineStatus('planning', 'idle');
        if (activeLayoutText) activeLayoutText.textContent = 'AI 추천 대기';
      }

      updateUC5LearningConditionState();
      validateUC5RunBtn();
    });
  });

  // Legacy handler retained only if an old index.html is accidentally deployed with name="uc5-template".
  legacyTemplateInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      uc5SelectedTemplate = e.target.value;
      const names = {
        template_matrix: 'The Concept Matrix',
        template_journey: 'The Linear Journey',
        template_split: 'The Tactical Split',
        template_divergence: 'The Dual Divergence'
      };
      if (activeLayoutText) {
        activeLayoutText.textContent = names[uc5SelectedTemplate] || uc5SelectedTemplate;
      }
      validateUC5RunBtn();
    });
  });

  setUC5SelectedMacroShell(getUC5SelectedMacroShell());
  setUC5PipelineStatus('planning', 'idle');

  // 6. Form-Factor Switching Layout Switches
  if (btnDesktop && btnMobile && viewportCanvas) {
    btnDesktop.addEventListener('click', () => {
      btnDesktop.classList.add('active');
      btnMobile.classList.remove('active');
      viewportCanvas.classList.remove('uc5-mobile-frame');
      scheduleUC5PreviewFit();
    });

    btnMobile.addEventListener('click', () => {
      btnMobile.classList.add('active');
      btnDesktop.classList.remove('active');
      viewportCanvas.classList.add('uc5-mobile-frame');
      scheduleUC5PreviewFit();
    });
  }

  window.addEventListener('resize', () => {
    scheduleUC5PreviewFit(80);
  });

  if (window.ResizeObserver && viewportCanvas) {
    const uc5PreviewResizeObserver = new ResizeObserver(() => scheduleUC5PreviewFit());
    uc5PreviewResizeObserver.observe(viewportCanvas);
  }

  scheduleUC5PreviewFit(0);

  if (uc5SavedPreviewSelect) {
    uc5SavedPreviewSelect.addEventListener('change', (e) => {
      const recordId = e.target.value;
      if (!recordId) {
        uc5SavedPreviewActiveId = '';
        renderUC5SavedPreviewSelector('');
        return;
      }
      loadUC5SavedPreview(recordId);
    });
  }

  if (uc5DeleteSavedPreviewBtn) {
    uc5DeleteSavedPreviewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!uc5SavedPreviewActiveId) return;
      deleteUC5SavedPreview(uc5SavedPreviewActiveId);
    });
  }

  renderUC5SavedPreviewSelector('');
  refreshUC5SavedPreviewSelectorFromFirebase('');


  // 7. Dynamic Layout Engine & String Compilers
  function compileConceptMatrix(slide, pageNum) {
    const heading = slide.heading || '핵심 주제 및 기본 이론 정의';
    const body = slide.body_segments || [];
    const graphic = slide.graphic_prompt || '조직의 협업과 디지털 혁신을 도식화한 기하학적 인포그래픽 패턴';

    return `
      <div class="uc5-layout-matrix">
        <div class="uc5-slide-header">
          <span class="uc5-slide-badge">Slide ${pageNum} · Concept Matrix</span>
          <h2>${heading}</h2>
        </div>
        <div class="uc5-matrix-grid">
          <!-- Card 1 -->
          <div class="uc5-flip-card">
            <div class="uc5-flip-card-inner">
              <div class="uc5-flip-card-front">
                <div class="uc5-card-header">💡 핵심 개념 (Core Concept)</div>
                <div class="uc5-card-body">${body[0] || '소스 교안 핵심 정의 설명'}</div>
                <div class="uc5-flip-hint">카드를 클릭하여 뒤집어보기</div>
              </div>
              <div class="uc5-flip-card-back">
                <div class="uc5-card-header">🔍 상세 분석 및 맥락</div>
                <div class="uc5-card-body">${body[0] || '소스 교안 핵심 정의 설명'}</div>
                <div class="uc5-card-sub">이 개념은 조직의 디지털 전환과 리더십 배양에 필수적인 요소로 작용합니다.</div>
              </div>
            </div>
          </div>
          <!-- Card 2 -->
          <div class="uc5-flip-card">
            <div class="uc5-flip-card-inner">
              <div class="uc5-flip-card-front">
                <div class="uc5-card-header">⚙️ 실무 전략 (Strategic Application)</div>
                <div class="uc5-card-body">${body[1] || '실무 적용을 위한 전술 전개'}</div>
                <div class="uc5-flip-hint">카드를 클릭하여 뒤집어보기</div>
              </div>
              <div class="uc5-flip-card-back">
                <div class="uc5-card-header">🚀 실행 방안 및 사례</div>
                <div class="uc5-card-body">${body[1] || '실무 적용을 위한 전술 전개'}</div>
                <div class="uc5-card-sub">상시 피드백 구조 및 정밀 모니터링 분석 툴을 병행하여 성과를 고도화합니다.</div>
              </div>
            </div>
          </div>
          <!-- Card 3 -->
          <div class="uc5-flip-card">
            <div class="uc5-flip-card-inner">
              <div class="uc5-flip-card-front">
                <div class="uc5-card-header">🎨 비주얼 가이드 (Visual Concept)</div>
                <div class="uc5-card-body">${graphic}</div>
                <div class="uc5-flip-hint">카드를 클릭하여 뒤집어보기</div>
              </div>
              <div class="uc5-flip-card-back">
                <div class="uc5-card-header">📸 시각 디자인 제안</div>
                <div class="uc5-card-body">${graphic}</div>
                <div class="uc5-card-sub">시인성이 뛰어난 고대비 그래픽 및 스키모픽 스타일의 메탈릭 텍스처 배치가 어울립니다.</div>
              </div>
            </div>
          </div>
          <!-- Card 4 -->
          <div class="uc5-flip-card">
            <div class="uc5-flip-card-inner">
              <div class="uc5-flip-card-front">
                <div class="uc5-card-header">🎯 종합 Takeaway</div>
                <div class="uc5-card-body">해당 과정의 궁극적 업무 생산성 개선 가이드라인 및 혁신 로드맵 요약.</div>
                <div class="uc5-flip-hint">카드를 클릭하여 뒤집어보기</div>
              </div>
              <div class="uc5-flip-card-back">
                <div class="uc5-card-header">🌟 핵심 테이크어웨이</div>
                <div class="uc5-card-body">비즈니스 혁신 리더로서, 자동화 파이프라인의 핵심 지표(KPI) 관리 및 유연한 부서 간 협업 협약(SLA) 기준을 준수하십시오.</div>
                <div class="uc5-card-sub">핵심 목표치: 자율 업무 자동화 프로세스 이수율 100% 목표.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function compileLinearJourney(slide, pageNum) {
    const heading = slide.heading || '순차 프로세스 및 로드맵 가이드';
    const body = slide.body_segments || [];
    const graphic = slide.graphic_prompt || '파이프라인 여정을 묘사한 화살표 연결선 테마 그래픽';

    return `
      <div class="uc5-layout-journey">
        <div class="uc5-slide-header">
          <span class="uc5-slide-badge">Slide ${pageNum} · Linear Journey</span>
          <h2>${heading}</h2>
        </div>
        
        <div class="uc5-journey-container">
          <div class="uc5-journey-line-svg-wrap">
            <svg class="uc5-journey-line-svg" viewBox="0 0 500 100" preserveAspectRatio="none">
              <path d="M 30,50 C 120,20 180,80 250,50 C 320,20 380,80 470,50" fill="none" stroke="#e2e8f0" stroke-width="4" stroke-dasharray="8 4" />
              <path class="uc5-journey-line-progress" id="uc5-journeyProgressLine" d="M 30,50 C 120,20 180,80 250,50 C 320,20 380,80 470,50" fill="none" stroke="var(--primary)" stroke-width="4" style="stroke-dasharray: 20 500; transition: stroke-dasharray 0.6s ease;" />
            </svg>
          </div>
          
          <div class="uc5-journey-nodes">
            <button class="uc5-journey-node active" data-node="1" style="left: 6%; top: 50%;">
              <span class="uc5-node-pin">📍</span>
              <span class="uc5-node-title">개요 (Intro)</span>
            </button>
            <button class="uc5-journey-node" data-node="2" style="left: 36%; top: 38%;">
              <span class="uc5-node-pin">📍</span>
              <span class="uc5-node-title">실행 (Action)</span>
            </button>
            <button class="uc5-journey-node" data-node="3" style="left: 66%; top: 62%;">
              <span class="uc5-node-pin">📍</span>
              <span class="uc5-node-title">비주얼 (Visual)</span>
            </button>
            <button class="uc5-journey-node" data-node="4" style="left: 94%; top: 50%;">
              <span class="uc5-node-pin">📍</span>
              <span class="uc5-node-title">성과 (Goal)</span>
            </button>
          </div>
        </div>

        <div class="uc5-journey-card-display" id="uc5-journeyDetailCard">
          <div class="uc5-journey-detail-header">
            <span class="uc5-journey-step-badge">STEP 1</span>
            <h3 class="uc5-journey-step-title">핵심 도입부 및 개요</h3>
          </div>
          <div class="uc5-journey-detail-body">
            ${body[0] || '임직원 혁신 개요 교육 내용'}
          </div>
          <div class="uc5-journey-detail-hint">각 여정 핀(Pin) 노드를 클릭하면 순차 실행 상세 가이드가 표시됩니다.</div>
        </div>
      </div>
    `;
  }

  function compileTacticalSplit(slide, pageNum) {
    const heading = slide.heading || '전술적 분석 및 대비 스플릿';
    const body = slide.body_segments || [];
    const graphic = slide.graphic_prompt || '중요 리스크 및 해결 프로세스를 비교 대조한 대칭형 반할 화면 인포그래픽';

    return `
      <div class="uc5-layout-split">
        <div class="uc5-slide-header">
          <span class="uc5-slide-badge">Slide ${pageNum} · Tactical Split</span>
          <h2>${heading}</h2>
        </div>
        
        <div class="uc5-split-columns">
          <!-- Left Panel -->
          <div class="uc5-split-col-left">
            <div class="uc5-split-brief-title">🚨 주요 운영 진단 Briefing</div>
            <div class="uc5-split-brief-text">${body[0] || '상황 진단 및 이슈 브리핑'}</div>
            
            <div class="uc5-split-metrics">
              <div class="uc5-split-metric-row">
                <div class="uc5-metric-info">
                  <span>🔥 핵심 시급도 (Priority)</span>
                  <span class="uc5-metric-value">92%</span>
                </div>
                <div class="uc5-metric-bar-outer">
                  <div class="uc5-metric-bar-inner" style="width: 0%" data-width="92%"></div>
                </div>
              </div>
              
              <div class="uc5-split-metric-row">
                <div class="uc5-metric-info">
                  <span>🛠️ 실행 타당도 (Feasibility)</span>
                  <span class="uc5-metric-value">78%</span>
                </div>
                <div class="uc5-metric-bar-outer">
                  <div class="uc5-metric-bar-inner" style="width: 0%" data-width="78%"></div>
                </div>
              </div>

              <div class="uc5-split-metric-row">
                <div class="uc5-metric-info">
                  <span>💎 비즈니스 임팩트 (Impact)</span>
                  <span class="uc5-metric-value">86%</span>
                </div>
                <div class="uc5-metric-bar-outer">
                  <div class="uc5-metric-bar-inner" style="width: 0%" data-width="86%"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Right Panel -->
          <div class="uc5-split-col-right">
            <div class="uc5-split-tabs">
              <button class="uc5-split-tab active" data-tab="solution">💡 실행 전략</button>
              <button class="uc5-split-tab" data-tab="visual">🎨 비주얼 가이드</button>
              <button class="uc5-split-tab" data-tab="impact">📈 기대 효과성</button>
            </div>
            
            <div class="uc5-split-tab-content" id="uc5-splitTabContent">
              <div class="uc5-split-content-title">💡 프로세스 프로세스 실행 및 세부 전략</div>
              <div class="uc5-split-content-body">${body[1] || '전략 세부 로드맵 설명'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function compileContextDivergence(slide, pageNum) {
    const heading = slide.heading || '양방향 대칭 대비적 전략 연구';
    const body = slide.body_segments || [];
    const graphic = slide.graphic_prompt || '상호작용하는 시스템 또는 대칭 인포그래픽';

    return `
      <div class="uc5-layout-divergence">
        <div class="uc5-slide-header">
          <span class="uc5-slide-badge">Slide ${pageNum} · Dual Divergence</span>
          <h2>${heading}</h2>
        </div>
        <div class="uc5-divergence-grid">
          <!-- Left Column: Context / Origin Panel -->
          <div class="uc5-divergence-col left">
            <div class="uc5-divergence-card">
              <div class="uc5-divergence-card-header">📚 이론적 기반 (Theory & Context)</div>
              <div class="uc5-divergence-card-body">${body[0] || '소스 교안 핵심 이론 설명'}</div>
            </div>
          </div>
          
          <!-- Center Column: Visual Bridge Metaphor Node -->
          <div class="uc5-divergence-col center">
            <div class="uc5-divergence-card bridge">
              <div class="uc5-divergence-card-header">🎨 비주얼 시각화 (Visual Metaphor)</div>
              <div class="uc5-divergence-card-body graphic">${graphic}</div>
            </div>
          </div>
          
          <!-- Right Column: Evolution / Practice Panel -->
          <div class="uc5-divergence-col right">
            <div class="uc5-divergence-card">
              <div class="uc5-divergence-card-header">⚙️ 실무 적용 (Practice & Evolution)</div>
              <div class="uc5-divergence-card-body">${body[1] || '실무 적용을 위한 전술적 실행'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function compileQuizSlide(slide) {
    const qText = slide.quiz_question || '다음 중 조직의 디지털 트랜스포메이션 실행 전략에서 가장 올바르지 않은 요소는 무엇입니까?';
    const opts = slide.options || ['자동화 파이프라인 무시', '클라우드 인프라 활용', '임직원 기술 교육 세션 설계', '부서간 민첩한 협업 촉진'];
    const explanation = slide.explanation || '자동화 파이프라인은 디지털 전환의 핵심 뼈대이므로 배제할 수 없습니다.';

    return `
      <div class="uc5-layout-quiz">
        <div class="uc5-slide-header">
          <span class="uc5-slide-badge">Slide 5 · Final Evaluation</span>
          <h2>✍️ 자가 진단 평가 퀴즈</h2>
        </div>
        
        <div class="uc5-quiz-container">
          <div class="uc5-quiz-q-box">
            <span class="uc5-quiz-q-badge">Q5</span>
            <div class="uc5-quiz-q-text">${qText}</div>
          </div>
          
          <div class="uc5-quiz-options-grid">
            <button class="uc5-quiz-option" data-option="A">
              <span class="uc5-opt-badge">A</span>
              <span class="uc5-opt-text">${opts[0] || 'A'}</span>
            </button>
            <button class="uc5-quiz-option" data-option="B">
              <span class="uc5-opt-badge">B</span>
              <span class="uc5-opt-text">${opts[1] || 'B'}</span>
            </button>
            <button class="uc5-quiz-option" data-option="C">
              <span class="uc5-opt-badge">C</span>
              <span class="uc5-opt-text">${opts[2] || 'C'}</span>
            </button>
            <button class="uc5-quiz-option" data-option="D">
              <span class="uc5-opt-badge">D</span>
              <span class="uc5-opt-text">${opts[3] || 'D'}</span>
            </button>
          </div>
          
          <div class="uc5-quiz-feedback" id="uc5-quizFeedback" style="display: none;">
            <div class="uc5-feedback-title" id="uc5-feedbackTitle">정답입니다! 🎉</div>
            <div class="uc5-feedback-text" id="uc5-feedbackText">${explanation}</div>
          </div>
        </div>
        
        <canvas class="uc5-confetti-canvas" id="uc5-confettiCanvas"></canvas>
      </div>
    `;
  }

  // 8. Main Slide Render Controller
  function renderUC5Slide() {
    if (!uc5SlidesData || uc5SlidesData.length < 5) return;

    // Stop any running confetti timer
    if (confettiTimer) {
      cancelAnimationFrame(confettiTimer);
      confettiTimer = null;
    }

    const slide = uc5SlidesData[uc5ActivePageIndex - 1];
    let html = '';

    if (uc5ActivePageIndex === 5) {
      html = compileQuizSlide(slide);
    } else {
      if (uc5SelectedTemplate === 'template_matrix') {
        html = compileConceptMatrix(slide, uc5ActivePageIndex);
      } else if (uc5SelectedTemplate === 'template_journey') {
        html = compileLinearJourney(slide, uc5ActivePageIndex);
      } else if (uc5SelectedTemplate === 'template_split') {
        html = compileTacticalSplit(slide, uc5ActivePageIndex);
      } else if (uc5SelectedTemplate === 'template_divergence') {
        html = compileContextDivergence(slide, uc5ActivePageIndex);
      }
    }

    // Wrap in scroll container with micro-interaction and overlay inner pagination
    const finalHtml = `
      <div class="uc5-inner-scroll-container uc5-fade-in-up">
        ${html}
      </div>
      <div class="uc5-inner-pagination">
        <button class="uc5-inner-nav-btn prev-slide-btn" ${uc5ActivePageIndex === 1 ? 'disabled' : ''}>Previous</button>
        <span class="uc5-inner-page-indicator">${uc5ActivePageIndex} / 5</span>
        <button class="uc5-inner-nav-btn next-slide-btn">${uc5ActivePageIndex === 5 ? 'Complete' : 'Next'}</button>
      </div>
    `;

    previewStage.innerHTML = finalHtml;
    updatePaginationUI();
    scheduleUC5PreviewFit();

    // Extra styling animations post-render
    if (uc5SelectedTemplate === 'template_split' && uc5ActivePageIndex !== 5) {
      setTimeout(() => {
        document.querySelectorAll('.uc5-metric-bar-inner').forEach(bar => {
          const w = bar.dataset.width;
          if (w) bar.style.width = w + '%';
        });
      }, 50);
    }
  }

  function normalizeUC5WebhookEnvelope(value) {
    let data = value;

    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (Array.isArray(data)) {
      data = data.find(item =>
        item &&
        typeof item === 'object' &&
        (item.response_payload || item.workflow_response_version || item.status || item.json)
      ) || data[0] || {};
    }

    if (data && typeof data === 'object' && data.json && typeof data.json === 'object') {
      data = data.json;
    }

    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    return data && typeof data === 'object' ? data : {};
  }

  function parseUC5WebhookResponse(rawText) {
    const firstParsed = JSON.parse(rawText);
    return normalizeUC5WebhookEnvelope(firstParsed);
  }

  function getUC5PrimaryComponentLabel(screen) {
    const positions = Array.isArray(screen?.skeleton_positions) ? screen.skeleton_positions : [];
    const firstSelected = positions.find(pos => pos?.selected_component_type)?.selected_component_type;
    if (firstSelected) return firstSelected;

    const firstCandidate = positions
      .flatMap(pos => Array.isArray(pos?.component_candidates) ? pos.component_candidates : [])
      .find(Boolean);

    return firstCandidate || 'planning';
  }

  function getUC5ResponsePayload(data) {
    const normalized = normalizeUC5WebhookEnvelope(data);
    return normalized.response_payload && typeof normalized.response_payload === 'object'
      ? normalized.response_payload
      : normalized;
  }

  function getUC5NarrativePlanningDraft(data) {
    const payload = getUC5ResponsePayload(data);
    return payload.narrative_planning_draft || data?.narrative_planning_draft || null;
  }

  function getUC5TemplateBoundBlueprint(data) {
    const payload = getUC5ResponsePayload(data);
    return payload.template_bound_blueprint || data?.template_bound_blueprint || null;
  }

  function getUC5SlotPayloadSeed(data) {
    const payload = getUC5ResponsePayload(data);
    return payload.slot_payload_seed || data?.slot_payload_seed || null;
  }

  function getUC5SourceCoverageSummary(data) {
    const payload = getUC5ResponsePayload(data);
    return payload.source_coverage_summary || data?.source_coverage_summary || null;
  }

  function getUC5CurrentUiSelectionFromDraft(draft) {
    return draft?.recommended_ui_selection || null;
  }

  async function buildUC5TemplateBlueprintFormData() {
    if (!uc5UploadedFile) {
      throw new Error('화면 설계에 사용할 원본 PDF가 없습니다. 파일을 다시 업로드해 주세요.');
    }

    const fromAiRecommendation = Boolean(uc5PlanningDraftData && uc5CurrentUiSelectionData);
    const currentUiSelection = fromAiRecommendation
      ? { ...(uc5CurrentUiSelectionData || {}) }
      : getUC5CurrentUiSelectionFromControls();

    const planningDraft = fromAiRecommendation
      ? uc5PlanningDraftData
      : buildUC5ManualPlanningDraft(currentUiSelection);

    uc5CurrentUiSelectionData = currentUiSelection;
    uc5PlanningDraftData = planningDraft;

    const sourceHandle = await ensureUC5SourceHandle();

    const planningContext = {
      ...getUC5PlanningContext(),
      planning_mode: 'template_bound_blueprint_planning',
      selection_source: fromAiRecommendation ? 'ai_recommendation_reviewed' : 'manual_admin_selection',
      content_density: currentUiSelection.content_density || getUC5FieldValue(uc5ContentDensity, 'standard'),
      target_audience: currentUiSelection.target_audience || getUC5FieldValue(uc5TargetAudience, 'general_employee'),
      target_duration_minutes: Number(currentUiSelection.target_duration_minutes || getUC5FieldValue(uc5TargetDuration, '7')),
      interaction_level: currentUiSelection.interaction_level || getUC5FieldValue(uc5InteractionLevel, 'medium'),
      gamification_level: currentUiSelection.gamification_level || getUC5FieldValue(uc5GamificationLevel, 'medium'),
      admin_notes: getUC5FieldValue(uc5AdminNotes, '')
    };
    const fileProfile = sourceHandle.file_profile || getUC5FileProfile(uc5UploadedFile);
    const templateRegistryBundle = await buildUC5TemplateRegistryBundle(currentUiSelection);

    const formData = new FormData();
    formData.append('request_type', 'uc5_template_bound_blueprint_planning');
    formData.append('workflow_version', 'uc5_r3_responses');
    formData.append('workflow_stage', 'template_bound_blueprint_planning');
    formData.append('workflow_mode', 'template_bound_blueprint_planning');
    formData.append('selection_source', fromAiRecommendation ? 'w01_narrative_planning_draft' : 'manual_admin_selection');
    formData.append('template_id', currentUiSelection.template_id || '');
    formData.append('macro_shell_id', currentUiSelection.macro_shell_id || '');
    formData.append('screen_count', String(currentUiSelection.screen_count || ''));
    formData.append('registry_version', UC5_EXPECTED_COMPONENT_REGISTRY_VERSION);
    formData.append('template_registry_bundle', JSON.stringify(templateRegistryBundle));
    console.info('[UC5 R2-2H] W02 template_registry_bundle attached', {
      template_id: currentUiSelection.template_id || '',
      macro_shell_id: currentUiSelection.macro_shell_id || '',
      allowed_component_count: templateRegistryBundle.allowed_component_count || 0
    });
    formData.append('file_name', fileProfile.file_name);
    formData.append('file_type', fileProfile.file_type || 'application/pdf');
    formData.append('file_size_bytes', String(fileProfile.file_size_bytes || 0));
    formData.append('narrative_planning_draft', JSON.stringify(planningDraft));
    formData.append('current_ui_selection', JSON.stringify(currentUiSelection));
    formData.append('planning_context', JSON.stringify(planningContext));
    formData.append('file_profile', JSON.stringify(fileProfile));
    appendUC5SourceHandleToFormData(formData, sourceHandle);

    return formData;
  }

  async function buildUC5SlotPayloadSeedFormDataForBlueprint(templateBoundBlueprint, payloadPolicyBundle) {
    if (!templateBoundBlueprint) {
      throw new Error('화면 구성 설계 결과가 없습니다. 먼저 기획안을 승인해 주세요.');
    }

    const sourceHandle = await ensureUC5SourceHandle();
    const currentUiSelection = templateBoundBlueprint.current_ui_selection || uc5CurrentUiSelectionData || {};
    const fileProfile = sourceHandle.file_profile || getUC5FileProfile(uc5UploadedFile);

    const formData = new FormData();
    formData.append('request_type', 'uc5_slot_payload_seed_composition');
    formData.append('workflow_version', 'uc5_r3d_frontend_shard');
    formData.append('workflow_stage', 'slot_payload_seed_composition');
    formData.append('workflow_mode', 'slot_payload_seed_composition');
    formData.append('template_id', currentUiSelection.template_id || '');
    formData.append('macro_shell_id', currentUiSelection.macro_shell_id || '');
    formData.append('screen_count', String(currentUiSelection.screen_count || ''));
    formData.append('registry_version', UC5_EXPECTED_COMPONENT_REGISTRY_VERSION);
    formData.append('payload_policy_bundle', JSON.stringify(payloadPolicyBundle));
    formData.append('file_name', fileProfile.file_name || '');
    formData.append('file_type', fileProfile.file_type || 'application/pdf');
    formData.append('file_size_bytes', String(fileProfile.file_size_bytes || 0));
    formData.append('template_bound_blueprint', JSON.stringify(templateBoundBlueprint));
    formData.append('current_ui_selection', JSON.stringify(currentUiSelection));
    formData.append('file_profile', JSON.stringify(fileProfile));
    appendUC5SourceHandleToFormData(formData, sourceHandle);

    return formData;
  }

  async function buildUC5SlotPayloadSeedFormData() {
    const payloadPolicyBundle = await buildUC5PayloadPolicyBundle(uc5TemplateBoundBlueprintData);
    console.info('[UC5 R3D] W03 payload_policy_bundle attached', {
      template_id: payloadPolicyBundle.template_id || '',
      macro_shell_id: payloadPolicyBundle.macro_shell_id || '',
      selected_component_count: payloadPolicyBundle.selected_component_count || 0
    });
    return buildUC5SlotPayloadSeedFormDataForBlueprint(uc5TemplateBoundBlueprintData, payloadPolicyBundle);
  }

  async function postUC5Workflow(url, formData, failureMessage) {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!res.ok) {
      throw new Error(`${failureMessage} (HTTP ${res.status})`);
    }

    const rawText = await res.text();

    try {
      return parseUC5WebhookResponse(rawText);
    } catch (parseError) {
      throw new Error(`${failureMessage}: 응답 JSON 파싱 실패`);
    }
  }

  function countUC5BlueprintSections(blueprint) {
    return (Array.isArray(blueprint?.screen_blueprints) ? blueprint.screen_blueprints : [])
      .reduce((sum, screen) => sum + (Array.isArray(screen?.skeleton_positions) ? screen.skeleton_positions.length : 0), 0);
  }

  function buildUC5SectionContractId(screenIndex, positionIndex) {
    return `s${Number(screenIndex)}_section_${Number(positionIndex) + 1}`;
  }

  function assembleUC5RenderPlan(templateBoundBlueprint, slotPayloadSeed, sourceCoverageSummary = null) {
    if (!templateBoundBlueprint || templateBoundBlueprint.blueprint_version !== 'uc5_template_bound_blueprint.v1') {
      throw new Error('화면 구성 설계 결과가 올바르지 않습니다.');
    }

    const acceptedSeedVersions = new Set(['uc5_slot_payload_seed.v1', 'uc5_slot_payload_seed.responses.v1']);
    if (!slotPayloadSeed || !acceptedSeedVersions.has(slotPayloadSeed.slot_payload_seed_version)) {
      throw new Error('학습 내용 작성 결과가 올바르지 않습니다.');
    }

    const seedSections = Array.isArray(slotPayloadSeed.sections) ? slotPayloadSeed.sections : [];
    const seedMap = new Map(seedSections.map(section => [section.source_contract_id, section]));
    const screenBlueprints = Array.isArray(templateBoundBlueprint.screen_blueprints) ? templateBoundBlueprint.screen_blueprints : [];
    const currentUiSelection = templateBoundBlueprint.current_ui_selection || {};
    const narrativeSummary = templateBoundBlueprint.narrative_summary || {};
    const selectedTemplate = templateBoundBlueprint.selected_template || {};

    const screens = screenBlueprints.map((screen) => {
      const positions = Array.isArray(screen.skeleton_positions) ? screen.skeleton_positions : [];
      const sections = positions.map((position, positionIndex) => {
        const sectionContractId = buildUC5SectionContractId(screen.screen_index, positionIndex);
        const payloadSection = seedMap.get(sectionContractId);

        if (!payloadSection) {
          throw new Error(`학습 내용 누락: ${sectionContractId}`);
        }

        return {
          section_contract_id: sectionContractId,
          source_contract_id: sectionContractId,
          source_position_id: position.position_id || `s${screen.screen_index}_p${positionIndex + 1}`,
          screen_index: screen.screen_index,
          screen_role: screen.screen_role,
          screen_title: screen.screen_title,
          learning_goal: screen.learning_goal,
          narrative_function: screen.narrative_function,
          slot_id: position.slot_hint || 'main',
          component_type: position.selected_component_type || 'concept_explainer',
          semantic_role: position.position_purpose || position.slot_hint || 'content',
          source_content_requirement: screen.source_evidence_brief || position.content_payload_brief || screen.learning_goal || '',
          narrative_placement_reason: position.selection_rationale || '',
          text_budget: position.text_budget || null,
          overflow_strategy: position.overflow_strategy || 'fit_or_summarize',
          interaction: payloadSection.interaction || { interaction_type: 'none', interaction_label: '', completion_rule: '' },
          component_payload: payloadSection.component_payload || {}
        };
      });

      return {
        screen_index: Number(screen.screen_index),
        screen_role: screen.screen_role || 'learning_screen',
        screen_title: screen.screen_title || `화면 ${screen.screen_index}`,
        learning_goal: screen.learning_goal || '',
        narrative_function: screen.narrative_function || '',
        source_evidence_brief: screen.source_evidence_brief || '',
        recommended_interactions: Array.isArray(screen.recommended_interactions) ? screen.recommended_interactions : [],
        content_notes: screen.content_notes || '',
        sections
      };
    });

    return {
      render_plan_version: 'uc5_render_plan.v1',
      version: 'uc5_render_plan.v1',
      status: 'ready_for_render',
      assembly_strategy: 'frontend_merge_blueprint_static_contract_with_slot_payload_seed',
      generated_at: new Date().toISOString(),
      lesson_meta: {
        lesson_title: narrativeSummary.lesson_title || '교육 모듈',
        lesson_subtitle: narrativeSummary.lesson_subtitle || '',
        learner_promise: narrativeSummary.learner_promise || '',
        completion_goal: narrativeSummary.completion_goal || '',
        macro_shell_id: selectedTemplate.macro_shell_id || currentUiSelection.macro_shell_id || '',
        template_id: selectedTemplate.template_id || currentUiSelection.template_id || '',
        screen_count: screens.length,
        language: currentUiSelection.language || 'ko'
      },
      layout_contract: {
        template_id: selectedTemplate.template_id || currentUiSelection.template_id || '',
        macro_shell_id: selectedTemplate.macro_shell_id || currentUiSelection.macro_shell_id || '',
        screen_count: screens.length,
        section_count: seedSections.length,
        renderer_target_contract: 'uc5_render_plan.v1'
      },
      source_lineage: {
        template_bound_blueprint_version: templateBoundBlueprint.blueprint_version,
        slot_payload_seed_version: slotPayloadSeed.slot_payload_seed_version,
        source_file_name: slotPayloadSeed.source_lineage?.source_file_name || templateBoundBlueprint.source_lineage?.source_file_name || ''
      },
      source_coverage_summary: sourceCoverageSummary || slotPayloadSeed.seed_validation?.source_coverage_summary || null,
      screens
    };
  }

  function normalizeUC5RenderPlan(plan) {
    const rawPlan = plan && typeof plan === 'object' ? plan : {};
    const rawScreens = Array.isArray(rawPlan.screens) ? rawPlan.screens : [];
    const screens = rawScreens
      .filter(screen => screen && typeof screen === 'object')
      .map((screen, idx) => ({
        ...screen,
        screen_index: Number.isFinite(Number(screen.screen_index)) ? Number(screen.screen_index) : idx + 1,
        sections: Array.isArray(screen.sections) ? screen.sections : []
      }))
      .sort((a, b) => a.screen_index - b.screen_index);

    return {
      ...rawPlan,
      screens
    };
  }

  function getUC5RenderPlanScreenCount(plan = uc5RenderPlanData) {
    return Array.isArray(plan?.screens) ? plan.screens.length : 0;
  }

  function getUC5V2Payload(section) {
    return section?.component_payload && typeof section.component_payload === 'object'
      ? section.component_payload
      : {};
  }

  function getUC5V2Array(value) {
    return Array.isArray(value) ? value : [];
  }

  function getUC5V2PayloadCollection(payload) {
    const cards = getUC5V2Array(payload.cards);
    const items = getUC5V2Array(payload.items);
    const steps = getUC5V2Array(payload.steps);
    const checklist = getUC5V2Array(payload.checklist_items);
    const options = getUC5V2Array(payload.options);

    if (cards.length) return cards;
    if (items.length) return items;
    if (steps.length) return steps;
    if (checklist.length) return checklist;
    if (options.length) return options;
    return [];
  }

  function getUC5V2SectionTitle(section) {
    const payload = getUC5V2Payload(section);
    return payload.title || section?.component_type || section?.semantic_role || 'Section';
  }

  function renderUC5V2PayloadIntro(section, { compact = false } = {}) {
    const payload = getUC5V2Payload(section);
    const eyebrow = payload.eyebrow || section?.semantic_role || '';
    const title = payload.title || section?.screen_title || getUC5V2SectionTitle(section);
    const subtitle = payload.subtitle || '';
    const summary = payload.summary || '';
    const body = payload.body || '';
    const keyMessage = payload.key_message || '';

    return `
      <div class="uc5-rp-intro${compact ? ' uc5-rp-intro-compact' : ''}">
        ${eyebrow ? `<div class="uc5-rp-kicker">${escapeHtml(eyebrow)}</div>` : ''}
        ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
        ${subtitle ? `<p class="uc5-rp-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        ${summary ? `<p class="uc5-rp-summary">${escapeHtml(summary)}</p>` : ''}
        ${body ? `<p class="uc5-rp-body">${escapeHtml(body)}</p>` : ''}
        ${keyMessage ? `<div class="uc5-rp-key-message">${escapeHtml(keyMessage)}</div>` : ''}
      </div>
    `;
  }

  function renderUC5V2SourceEvidence(section) {
    const payload = getUC5V2Payload(section);
    const evidence = payload.source_evidence || section?.source_content_requirement || '';
    if (!evidence) return '';
    return `<div class="uc5-rp-source-note">근거: ${escapeHtml(evidence)}</div>`;
  }

  function renderUC5V2CardGrid(entries, { variant = 'card' } = {}) {
    const safeEntries = getUC5V2Array(entries).slice(0, 8);
    if (!safeEntries.length) return '';

    return `
      <div class="uc5-rp-card-grid uc5-rp-card-grid-${escapeHtml(variant)}">
        ${safeEntries.map((entry, idx) => {
      const badge = entry.badge || entry.label || entry.value || String(idx + 1);
      const title = entry.title || entry.term || entry.label || entry.id || `Item ${idx + 1}`;
      const body = entry.body || entry.definition || entry.detail || entry.feedback || '';
      const detail = entry.detail || entry.note || '';

      return `
            <article class="uc5-rp-mini-card">
              <div class="uc5-rp-mini-card-badge">${escapeHtml(badge)}</div>
              <h4>${escapeHtml(title)}</h4>
              ${body ? `<p>${escapeHtml(body)}</p>` : ''}
              ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
            </article>
          `;
    }).join('')}
      </div>
    `;
  }

  function renderUC5V2HeroStatement(section) {
    return `
      <section class="uc5-rp-hero-card">
        ${renderUC5V2PayloadIntro(section)}
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2KeyMessageBanner(section) {
    const payload = getUC5V2Payload(section);
    const message = payload.key_message || payload.summary || payload.body || payload.title || '핵심 메시지';
    return `
      <section class="uc5-rp-message-banner">
        ${payload.eyebrow ? `<span>${escapeHtml(payload.eyebrow)}</span>` : ''}
        <strong>${escapeHtml(message)}</strong>
      </section>
    `;
  }

  function renderUC5V2OutcomeBadges(section) {
    const payload = getUC5V2Payload(section);
    const entries = getUC5V2Array(payload.cards).length ? payload.cards : payload.items;
    return `
      <section class="uc5-rp-standard-block">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        ${renderUC5V2CardGrid(entries, { variant: 'badge' })}
      </section>
    `;
  }

  function renderUC5V2DefinitionBlock(section) {
    return `
      <section class="uc5-rp-definition-block">
        ${renderUC5V2PayloadIntro(section)}
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2DefinitionCompare(section) {
    const payload = getUC5V2Payload(section);
    const entries = getUC5V2Array(payload.cards).length ? payload.cards : payload.items;
    return `
      <section class="uc5-rp-standard-block">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        ${renderUC5V2CardGrid(entries, { variant: 'compare' })}
      </section>
    `;
  }

  function renderUC5V2PrincipleCard(section) {
    return `
      <section class="uc5-rp-principle-card">
        ${renderUC5V2PayloadIntro(section)}
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2AttributeStack(section) {
    const payload = getUC5V2Payload(section);
    const entries = getUC5V2Array(payload.items).length ? payload.items : payload.cards;
    return `
      <section class="uc5-rp-standard-block">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        ${renderUC5V2CardGrid(entries, { variant: 'attribute' })}
      </section>
    `;
  }

  function renderUC5V2ProcessTimeline(section) {
    const payload = getUC5V2Payload(section);
    const steps = getUC5V2Array(payload.steps).length ? payload.steps : payload.items;
    return `
      <section class="uc5-rp-standard-block">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-timeline">
          ${steps.slice(0, 8).map((step, idx) => `
            <article class="uc5-rp-timeline-step">
              <div class="uc5-rp-timeline-index">${escapeHtml(step.label || String(idx + 1))}</div>
              <div>
                <h4>${escapeHtml(step.title || step.label || `Step ${idx + 1}`)}</h4>
                ${step.body ? `<p>${escapeHtml(step.body)}</p>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderUC5V2PhaseCards(section) {
    const payload = getUC5V2Payload(section);
    const entries = getUC5V2Array(payload.cards).length ? payload.cards : payload.steps;
    return `
      <section class="uc5-rp-standard-block">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        ${renderUC5V2CardGrid(entries, { variant: 'phase' })}
      </section>
    `;
  }

  function renderUC5V2Checklist(section) {
    const payload = getUC5V2Payload(section);
    const entries = getUC5V2Array(payload.checklist_items).length ? payload.checklist_items : payload.items;
    return `
      <section class="uc5-rp-standard-block">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-checklist">
          ${entries.slice(0, 8).map((item, idx) => `
            <button type="button" class="uc5-rp-check-item" data-uc5-rp-check="${escapeHtml(item.id || idx)}">
              <span class="uc5-rp-check-box">✓</span>
              <span>
                <strong>${escapeHtml(item.title || item.label || `Check ${idx + 1}`)}</strong>
                ${item.body ? `<em>${escapeHtml(item.body)}</em>` : ''}
              </span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderUC5V2Quiz(section) {
    const payload = getUC5V2Payload(section);
    const options = getUC5V2Array(payload.options);
    return `
      <section class="uc5-rp-standard-block uc5-rp-quiz-block">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-quiz-options">
          ${options.slice(0, 6).map(option => `
            <button type="button" class="uc5-rp-quiz-option" data-uc5-rp-correct="${option.is_correct ? 'true' : 'false'}" data-uc5-rp-feedback="${escapeHtml(option.feedback || '')}">
              <span>${escapeHtml(option.label || '')}</span>
              <strong>${escapeHtml(option.body || option.title || '')}</strong>
            </button>
          `).join('')}
        </div>
        <div class="uc5-rp-quiz-feedback" aria-live="polite"></div>
      </section>
    `;
  }

  function renderUC5V2CommitmentCard(section) {
    const payload = getUC5V2Payload(section);
    return `
      <section class="uc5-rp-commitment-card">
        ${renderUC5V2PayloadIntro(section)}
        ${renderUC5V2Checklist(section)}
      </section>
    `;
  }

  function renderUC5V2PrimaryEntries(payload, preferredArrays = []) {
    const arrays = Array.isArray(preferredArrays) && preferredArrays.length
      ? preferredArrays
      : ['cards', 'items', 'steps', 'checklist_items', 'options'];

    for (const key of arrays) {
      const values = getUC5V2Array(payload?.[key]);
      if (values.length) return values;
    }

    return getUC5V2PayloadCollection(payload);
  }

  function renderUC5V2PlaybookScopeCard(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['cards', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-playbook-scope-card">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-scope-grid">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-scope-item">
              <div class="uc5-rp-scope-badge">${escapeHtml(entry.badge || entry.label || String(idx + 1))}</div>
              <h4>${escapeHtml(entry.title || `적용 기준 ${idx + 1}`)}</h4>
              ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2DecisionGatePanel(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['cards', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-decision-gate-panel">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-gate-flow">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-gate-card">
              <span class="uc5-rp-gate-index">${escapeHtml(entry.label || String(idx + 1))}</span>
              <div>
                <h4>${escapeHtml(entry.title || `판단 ${idx + 1}`)}</h4>
                ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2ResponseStepTable(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['checklist_items', 'steps']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-response-step-table">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-step-table" role="table" aria-label="${escapeHtml(getUC5V2SectionTitle(section))}">
          <div class="uc5-rp-step-table-row uc5-rp-step-table-head" role="row">
            <span role="columnheader">Step</span>
            <span role="columnheader">Action</span>
          </div>
          ${entries.slice(0, 8).map((item, idx) => `
            <div class="uc5-rp-step-table-row" role="row">
              <span role="cell">${escapeHtml(item.label || String(idx + 1))}</span>
              <span role="cell">
                <strong>${escapeHtml(item.title || `실행 항목 ${idx + 1}`)}</strong>
                ${item.body ? `<em>${escapeHtml(item.body)}</em>` : ''}
              </span>
            </div>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2CoordinationMatrix(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['cards', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-coordination-matrix">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-matrix-grid">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-matrix-card">
              <div class="uc5-rp-matrix-role">${escapeHtml(entry.label || entry.badge || `Role ${idx + 1}`)}</div>
              <h4>${escapeHtml(entry.title || `역할 ${idx + 1}`)}</h4>
              ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
              ${entry.detail ? `<small>${escapeHtml(entry.detail)}</small>` : ''}
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2ReportingTimeline(section) {
    const payload = getUC5V2Payload(section);
    const steps = renderUC5V2PrimaryEntries(payload, ['steps']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-reporting-timeline">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-reporting-rail">
          ${steps.slice(0, 8).map((step, idx) => `
            <article class="uc5-rp-reporting-step">
              <span>${escapeHtml(step.label || String(idx + 1))}</span>
              <div>
                <h4>${escapeHtml(step.title || `보고 단계 ${idx + 1}`)}</h4>
                ${step.body ? `<p>${escapeHtml(step.body)}</p>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2StatusClassifier(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['cards', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-status-classifier">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-status-grid">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-status-card">
              <div class="uc5-rp-status-pill">${escapeHtml(entry.badge || entry.label || String(idx + 1))}</div>
              <h4>${escapeHtml(entry.title || `상태 ${idx + 1}`)}</h4>
              ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }


  function renderUC5V2ScenarioInjectTimeline(section) {
    const payload = getUC5V2Payload(section);
    const steps = renderUC5V2PrimaryEntries(payload, ['steps', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-scenario-inject-timeline">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-inject-rail">
          ${steps.slice(0, 8).map((step, idx) => `
            <article class="uc5-rp-inject-step">
              <div class="uc5-rp-inject-marker">${escapeHtml(step.label || `T${idx + 1}`)}</div>
              <div>
                <h4>${escapeHtml(step.title || `인젝트 ${idx + 1}`)}</h4>
                ${step.body ? `<p>${escapeHtml(step.body)}</p>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2DecisionOptionPanel(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['cards', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-decision-option-panel">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-decision-options">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-decision-option-card">
              <span class="uc5-rp-decision-option-label">${escapeHtml(entry.badge || entry.label || String(idx + 1))}</span>
              <h4>${escapeHtml(entry.title || `선택지 ${idx + 1}`)}</h4>
              ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
              ${entry.detail ? `<small>${escapeHtml(entry.detail)}</small>` : ''}
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2TradeoffConsequenceMap(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['cards', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-tradeoff-consequence-map">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-tradeoff-grid">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-tradeoff-card">
              <div class="uc5-rp-tradeoff-axis">${escapeHtml(entry.label || entry.badge || `영향 ${idx + 1}`)}</div>
              <h4>${escapeHtml(entry.title || `결과 ${idx + 1}`)}</h4>
              ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
              ${entry.value ? `<strong>${escapeHtml(entry.value)}</strong>` : ''}
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2DiscussionQuestionDeck(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['items', 'cards']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-discussion-question-deck">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-question-deck">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-question-card">
              <span class="uc5-rp-question-mark">${escapeHtml(entry.label || `Q${idx + 1}`)}</span>
              <div>
                <h4>${escapeHtml(entry.title || `토론 질문 ${idx + 1}`)}</h4>
                ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2OutcomeCapturePanel(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['checklist_items', 'items', 'cards']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-outcome-capture-panel">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-outcome-list">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-outcome-item">
              <span>${escapeHtml(entry.label || String(idx + 1))}</span>
              <div>
                <h4>${escapeHtml(entry.title || `회고 항목 ${idx + 1}`)}</h4>
                ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2InformationSharingMatrix(section) {
    const payload = getUC5V2Payload(section);
    const entries = renderUC5V2PrimaryEntries(payload, ['cards', 'items']);
    return `
      <section class="uc5-rp-standard-block uc5-rp-information-sharing-matrix">
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        <div class="uc5-rp-sharing-grid">
          ${entries.slice(0, 6).map((entry, idx) => `
            <article class="uc5-rp-sharing-card">
              <div class="uc5-rp-sharing-label">${escapeHtml(entry.label || entry.badge || `공유 ${idx + 1}`)}</div>
              <h4>${escapeHtml(entry.title || `공유 대상 ${idx + 1}`)}</h4>
              ${entry.body ? `<p>${escapeHtml(entry.body)}</p>` : ''}
              ${entry.detail ? `<small>${escapeHtml(entry.detail)}</small>` : ''}
            </article>
          `).join('')}
        </div>
        ${renderUC5V2SourceEvidence(section)}
      </section>
    `;
  }

  function renderUC5V2FallbackSection(section) {
    const payload = getUC5V2Payload(section);
    const entries = getUC5V2PayloadCollection(payload);
    return `
      <section class="uc5-rp-standard-block uc5-rp-fallback-block">
        <div class="uc5-rp-fallback-tag">${escapeHtml(section?.component_type || 'unsupported_component')}</div>
        ${renderUC5V2PayloadIntro(section, { compact: true })}
        ${renderUC5V2CardGrid(entries, { variant: 'fallback' })}
      </section>
    `;
  }

  const UC5_RENDER_PLAN_COMPONENTS = {
    hero_statement: renderUC5V2HeroStatement,
    module_intro: renderUC5V2HeroStatement,
    key_message_banner: renderUC5V2KeyMessageBanner,
    outcome_badges: renderUC5V2OutcomeBadges,
    objective_list: renderUC5V2OutcomeBadges,
    definition_block: renderUC5V2DefinitionBlock,
    concept_explainer: renderUC5V2DefinitionBlock,
    definition_compare: renderUC5V2DefinitionCompare,
    principle_card: renderUC5V2PrincipleCard,
    attribute_stack: renderUC5V2AttributeStack,
    concept_card_grid: renderUC5V2AttributeStack,
    stakeholder_map: renderUC5V2AttributeStack,
    scenario_inject_timeline: renderUC5V2ScenarioInjectTimeline,
    decision_option_panel: renderUC5V2DecisionOptionPanel,
    tradeoff_consequence_map: renderUC5V2TradeoffConsequenceMap,
    discussion_question_deck: renderUC5V2DiscussionQuestionDeck,
    outcome_capture_panel: renderUC5V2OutcomeCapturePanel,
    information_sharing_matrix: renderUC5V2InformationSharingMatrix,
    playbook_scope_card: renderUC5V2PlaybookScopeCard,
    decision_gate_panel: renderUC5V2DecisionGatePanel,
    response_step_table: renderUC5V2ResponseStepTable,
    coordination_matrix: renderUC5V2CoordinationMatrix,
    reporting_timeline: renderUC5V2ReportingTimeline,
    status_classifier: renderUC5V2StatusClassifier,
    process_timeline: renderUC5V2ProcessTimeline,
    method_stepper: renderUC5V2ProcessTimeline,
    phase_cards: renderUC5V2PhaseCards,
    application_checklist: renderUC5V2Checklist,
    checklist_table: renderUC5V2Checklist,
    quiz_mcq: renderUC5V2Quiz,
    scenario_quiz: renderUC5V2Quiz,
    commitment_card: renderUC5V2CommitmentCard,
    reflection_prompt: renderUC5V2CommitmentCard
  };

  function renderUC5V2Section(section) {
    const renderer = UC5_RENDER_PLAN_COMPONENTS[section?.component_type] || renderUC5V2FallbackSection;
    const semanticRole = section?.semantic_role || 'semantic_role_unknown';
    const slotId = section?.slot_id || 'main';
    const interaction = section?.interaction?.interaction_type || 'none';
    const placementReason = section?.narrative_placement_reason || '';

    return `
      <div class="uc5-rp-section uc5-rp-slot-${escapeHtml(slotId)}" data-uc5-rp-slot="${escapeHtml(slotId)}" data-uc5-rp-interaction="${escapeHtml(interaction)}">
        <div class="uc5-rp-section-meta">
          <span>${escapeHtml(slotId)}</span>
          <span>${escapeHtml(semanticRole)}</span>
        </div>
        ${renderer(section)}
        ${placementReason ? `
          <details class="uc5-rp-reason">
            <summary>배치 이유</summary>
            <p>${escapeHtml(placementReason)}</p>
          </details>
        ` : ''}
      </div>
    `;
  }

  function renderUC5V2CurrentScreen() {
    if (!uc5RenderPlanData) return;

    const screens = Array.isArray(uc5RenderPlanData.screens) ? uc5RenderPlanData.screens : [];
    const screenCount = screens.length;
    if (!screenCount) return;

    uc5RenderPlanScreenIndex = Math.min(Math.max(uc5RenderPlanScreenIndex, 0), screenCount - 1);
    const screen = screens[uc5RenderPlanScreenIndex];
    const lesson = uc5RenderPlanData.lesson_meta || {};
    const shell = lesson.macro_shell_id || uc5RenderPlanData.layout_contract?.macro_shell_id || 'learning_canvas';
    const progressPercent = Math.round(((uc5RenderPlanScreenIndex + 1) / screenCount) * 100);
    const sections = Array.isArray(screen.sections) ? screen.sections : [];

    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (paginationFooter) paginationFooter.style.display = 'none';
    if (activeLayoutText) activeLayoutText.textContent = `최종 교육 미리보기 · ${shell}`;

    previewStage.innerHTML = `
      <div class="uc5-inner-scroll-container uc5-rp-scroll uc5-fade-in-up">
        <article class="uc5-render-plan-shell" data-uc5-rp-shell="${escapeHtml(shell)}">
          <header class="uc5-rp-screen-header">
            <div>
              <div class="uc5-rp-kicker">${escapeHtml(lesson.lesson_title || 'UC5 Learning Module')}</div>
              <h2>${escapeHtml(screen.screen_title || `화면 ${uc5RenderPlanScreenIndex + 1}`)}</h2>
              <p>${escapeHtml(screen.learning_goal || screen.narrative_function || '')}</p>
            </div>
            <div class="uc5-rp-progress-card">
              <span>${uc5RenderPlanScreenIndex + 1} / ${screenCount}</span>
              <strong>${progressPercent}%</strong>
            </div>
          </header>

          <div class="uc5-rp-progress-track" aria-hidden="true">
            <span style="width: ${progressPercent}%"></span>
          </div>

          <section class="uc5-rp-screen-grid">
            ${sections.map(section => renderUC5V2Section(section)).join('') || `
              <div class="uc5-rp-section uc5-rp-slot-main">
                ${renderUC5V2FallbackSection({ component_type: 'empty_screen', component_payload: { title: '표시할 섹션이 없습니다.', summary: '', body: '', items: [] } })}
              </div>
            `}
          </section>
        </article>
      </div>
      <div class="uc5-inner-pagination uc5-rp-pagination">
        <button class="uc5-inner-nav-btn uc5-v2-prev-btn" ${uc5RenderPlanScreenIndex === 0 ? 'disabled' : ''}>Previous</button>
        <span class="uc5-inner-page-indicator">화면 ${uc5RenderPlanScreenIndex + 1} / ${screenCount}</span>
        <button class="uc5-inner-nav-btn uc5-v2-next-btn">${uc5RenderPlanScreenIndex === screenCount - 1 ? 'Complete' : 'Next'}</button>
      </div>
    `;

    scheduleUC5PreviewFit();
  }

  function renderUC5RenderPlan(data, options = {}) {
    const { persist = false, savedRecord = null } = options || {};
    uc5PlanningDraftData = null;
    uc5SlidesData = null;
    uc5RenderPlanData = normalizeUC5RenderPlan(data);
    uc5SavedHtmlPreviewData = null;
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};

    if (confettiTimer) {
      cancelAnimationFrame(confettiTimer);
      confettiTimer = null;
    }

    renderUC5V2CurrentScreen();

    if (persist) {
      saveUC5CompletedPreview(uc5RenderPlanData)
        .then((saved) => {
          if (activeLayoutText && saved) {
            activeLayoutText.textContent = `최종 교육 미리보기 · ${saved.macro_shell_id || uc5RenderPlanData.lesson_meta?.macro_shell_id || 'UC5'} · 저장됨`;
          }
        })
        .catch((err) => {
          console.warn('[UC5] Firebase 최종 Preview 저장 실패', err);
          if (activeLayoutText) {
            activeLayoutText.textContent = `최종 교육 미리보기 · ${uc5RenderPlanData.lesson_meta?.macro_shell_id || 'UC5'} · 저장 실패`;
          }
        });
    } else if (savedRecord && activeLayoutText) {
      activeLayoutText.textContent = `저장 Preview 불러옴 · ${savedRecord.macro_shell_id || savedRecord.template_id || 'UC5'}`;
    }
  }


  function renderUC5TemplateBlueprintPreview(blueprint) {
    uc5TemplateBoundBlueprintData = blueprint;
    uc5SlotPayloadSeedData = null;
    uc5SourceCoverageSummaryData = null;
    uc5RenderPlanData = null;
    uc5SavedHtmlPreviewData = null;
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};

    if (paginationFooter) {
      paginationFooter.style.display = 'none';
    }

    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    if (activeLayoutText) {
      activeLayoutText.textContent = '화면 설계안 검토';
    }

    setUC5PipelineStatus('blueprint', 'done');
    updateUC5LearningConditionState();

    const screens = Array.isArray(blueprint?.screen_blueprints) ? blueprint.screen_blueprints : [];
    const sectionCount = countUC5BlueprintSections(blueprint);
    const summary = blueprint?.narrative_summary || {};
    const selectedTemplate = blueprint?.selected_template || {};

    const screenHtml = screens.map((screen) => {
      const positions = Array.isArray(screen.skeleton_positions) ? screen.skeleton_positions : [];
      const positionHtml = positions.map((position, index) => `
        <div class="uc5-blueprint-position">
          <span>${escapeHtml(index + 1)}</span>
          <strong>${escapeHtml(position.position_purpose || position.slot_hint || '콘텐츠 영역')}</strong>
          <em>${escapeHtml(position.selected_component_type || 'component')}</em>
        </div>
      `).join('');

      return `
        <article class="uc5-blueprint-screen-card">
          <div class="uc5-blueprint-screen-head">
            <span>화면 ${escapeHtml(screen.screen_index || '')}</span>
            <strong>${escapeHtml(screen.screen_title || '교육 화면')}</strong>
          </div>
          <p>${escapeHtml(screen.learning_goal || screen.narrative_function || '')}</p>
          <div class="uc5-blueprint-position-list">
            ${positionHtml}
          </div>
        </article>
      `;
    }).join('');

    if (previewStage) {
      previewStage.innerHTML = `
        <div class="uc5-blueprint-preview uc5-fade-in-up">
          <div class="uc5-planning-review-head">
            <div>
              <div class="uc5-planning-review-kicker">교육 화면 설계안</div>
              <h3>${escapeHtml(summary.lesson_title || '교육 화면 설계안')}</h3>
              <p class="uc5-planning-review-subtitle">
                ${escapeHtml(summary.lesson_subtitle || summary.learner_promise || '화면별 역할과 콘텐츠 영역을 구성했습니다.')}
              </p>
            </div>
            <div class="uc5-planning-status-badge">내용 작성 대기</div>
          </div>

          <div class="uc5-planning-summary-grid">
            <div class="uc5-planning-summary-card">
              <span>화면 수</span>
              <strong>${escapeHtml(screens.length)}</strong>
            </div>
            <div class="uc5-planning-summary-card">
              <span>콘텐츠 블록</span>
              <strong>${escapeHtml(sectionCount)}</strong>
            </div>
            <div class="uc5-planning-summary-card">
              <span>교육 구성</span>
              <strong>${escapeHtml(selectedTemplate.macro_shell_id || '-')}</strong>
            </div>
            <div class="uc5-planning-summary-card">
              <span>템플릿</span>
              <strong>${escapeHtml(selectedTemplate.template_id || '-')}</strong>
            </div>
          </div>

          <div class="uc5-blueprint-screen-grid">
            ${screenHtml || '<div class="uc5-empty-preview"><h3>화면 설계안 없음</h3></div>'}
          </div>

          <div class="uc5-planning-review-actions">
            <button
              type="button"
              class="uc5-review-btn uc5-review-btn-ghost"
              data-uc5-action="back-to-input"
            >
              조건 수정
            </button>

            <button
              type="button"
              class="uc5-review-btn uc5-review-btn-secondary"
              data-uc5-action="regenerate-blueprint"
            >
              설계안 다시 만들기
            </button>

            <button
              type="button"
              class="uc5-review-btn uc5-review-btn-primary"
              data-uc5-action="create-final-preview"
            >
              내용 작성하고 최종 미리보기 만들기
            </button>
          </div>
        </div>
      `;
      scheduleUC5PreviewFit();
    }
  }

  async function requestUC5TemplateBlueprintFromCurrentSelection() {
    if (!uc5UploadedFile) {
      alert('교육 원문 PDF를 먼저 업로드해 주세요.');
      return;
    }

    const actionBtn = uc5RunBtn;
    const approveBtn = previewStage?.querySelector('[data-uc5-action="approve-planning"]');
    const regenerateBtn = previewStage?.querySelector('[data-uc5-action="regenerate-planning"]');

    if (actionBtn) {
      actionBtn.disabled = true;
      actionBtn.textContent = '화면 설계안 만드는 중...';
    }

    if (approveBtn) {
      approveBtn.disabled = true;
      approveBtn.textContent = '화면 설계안 만드는 중...';
    }

    if (regenerateBtn) {
      regenerateBtn.disabled = true;
    }

    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }

    try {
      uc5TemplateBoundBlueprintData = null;
      uc5SlotPayloadSeedData = null;
      uc5SourceCoverageSummaryData = null;
      uc5RenderPlanData = null;
      uc5SavedHtmlPreviewData = null;
      uc5RenderPlanScreenIndex = 0;
      uc5RenderPlanInteractionState = {};

      setUC5PipelineStatus('blueprint', 'active');
      setUC5LoadingCopy('blueprint');
      scheduleUC5PreviewFit();

      const blueprintFormData = await buildUC5TemplateBlueprintFormData();
      const blueprintResponse = await postUC5Workflow(
        CONFIG.UC5_W02_WEBHOOK,
        blueprintFormData,
        '교육 화면 설계안 생성 실패'
      );

      const blueprintPayload = getUC5ResponsePayload(blueprintResponse);
      const blueprint = getUC5TemplateBoundBlueprint(blueprintResponse);

      if (blueprintPayload.validation_status !== 'pass' || !blueprint) {
        throw new Error('교육 화면 설계안 검증에 실패했습니다. 관리자 검토가 필요합니다.');
      }

      renderUC5TemplateBlueprintPreview(blueprint);
    } catch (err) {
      console.error(err);
      setUC5PipelineStatus('blueprint', 'error');

      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }

      if (previewStage) {
        previewStage.innerHTML = `
          <div class="uc5-empty-preview">
            <span class="uc5-empty-icon" style="color: var(--danger);">⚠️</span>
            <h3 style="color: var(--danger);">교육 화면 설계안 생성 실패</h3>
            <p>${escapeHtml(err.message || '네트워크 통신 중 에러가 발생했습니다.')}</p>
          </div>
        `;
        scheduleUC5PreviewFit();
      }
    } finally {
      validateUC5RunBtn();
      if (actionBtn) actionBtn.textContent = '교육 기획안 만들기';
      if (approveBtn) {
        approveBtn.disabled = false;
        approveBtn.textContent = '이 구성으로 교육 기획안 만들기';
      }
      if (regenerateBtn) regenerateBtn.disabled = false;
    }
  }

  function countUC5ScreenSections(screen) {
    return Array.isArray(screen?.skeleton_positions) ? screen.skeleton_positions.length : 0;
  }

  function buildUC5R3DShardPlan(templateBoundBlueprint) {
    const screens = Array.isArray(templateBoundBlueprint?.screen_blueprints)
      ? templateBoundBlueprint.screen_blueprints.slice().sort((a, b) => Number(a.screen_index) - Number(b.screen_index))
      : [];

    const shards = [];
    let current = [];
    let currentSectionCount = 0;

    const flush = () => {
      if (!current.length) return;
      const shardIndex = shards.length + 1;
      const expectedIds = [];
      const components = new Set();
      for (const screen of current) {
        const positions = Array.isArray(screen.skeleton_positions) ? screen.skeleton_positions : [];
        positions.forEach((position, positionIndex) => {
          expectedIds.push(buildUC5SectionContractId(screen.screen_index, positionIndex));
          if (position?.selected_component_type) components.add(position.selected_component_type);
        });
      }
      shards.push({
        shard_id: `shard_${String(shardIndex).padStart(2, '0')}`,
        shard_index: shardIndex,
        screen_indexes: current.map(screen => Number(screen.screen_index)),
        expected_section_ids: expectedIds,
        expected_section_count: expectedIds.length,
        components: Array.from(components).sort((a, b) => a.localeCompare(b)),
        screens: current
      });
      current = [];
      currentSectionCount = 0;
    };

    for (const screen of screens) {
      const sectionCount = countUC5ScreenSections(screen);
      const nextWouldExceedScreenLimit = current.length >= UC5_R3D_SCREENS_PER_SHARD;
      const nextWouldExceedSectionLimit = current.length && currentSectionCount + sectionCount > UC5_R3D_MAX_SECTIONS_PER_SHARD;
      if (nextWouldExceedScreenLimit || nextWouldExceedSectionLimit) flush();
      current.push(screen);
      currentSectionCount += sectionCount;
    }
    flush();

    return {
      plan_version: 'uc5_w03_r3d_frontend_shard_plan.v1',
      screens_per_shard: UC5_R3D_SCREENS_PER_SHARD,
      max_sections_per_shard: UC5_R3D_MAX_SECTIONS_PER_SHARD,
      expected_section_count: countUC5BlueprintSections(templateBoundBlueprint),
      shard_count: shards.length,
      shards
    };
  }

  function buildUC5R3DShardBlueprint(templateBoundBlueprint, shard) {
    const allScreens = Array.isArray(templateBoundBlueprint?.screen_blueprints)
      ? templateBoundBlueprint.screen_blueprints.slice().sort((a, b) => Number(a.screen_index) - Number(b.screen_index))
      : [];
    const titleByIndex = new Map(allScreens.map(screen => [Number(screen.screen_index), screen.screen_title || `화면 ${screen.screen_index}`]));
    const totalScreens = allScreens.length;

    return {
      ...cloneUC5Json(templateBoundBlueprint),
      current_ui_selection: {
        ...(templateBoundBlueprint.current_ui_selection || {}),
        screen_count: templateBoundBlueprint.current_ui_selection?.screen_count || totalScreens
      },
      screen_blueprints: shard.screens.map((screen) => {
        const screenIndex = Number(screen.screen_index);
        const previousTitle = titleByIndex.get(screenIndex - 1) || '';
        const nextTitle = titleByIndex.get(screenIndex + 1) || '';
        const continuityNote = [
          `R3D shard context: this is screen ${screenIndex} of ${totalScreens}.`,
          previousTitle ? `Previous screen: ${previousTitle}` : '',
          nextTitle ? `Next screen: ${nextTitle}` : ''
        ].filter(Boolean).join(' ');

        return {
          ...cloneUC5Json(screen),
          narrative_function: [screen.narrative_function || '', continuityNote].filter(Boolean).join('\n'),
          content_notes: [screen.content_notes || '', continuityNote].filter(Boolean).join('\n')
        };
      }),
      r3d_shard_context: {
        shard_id: shard.shard_id,
        shard_index: shard.shard_index,
        shard_count: null,
        screen_indexes: shard.screen_indexes,
        expected_section_ids: shard.expected_section_ids,
        full_screen_outline: allScreens.map(screen => ({
          screen_index: screen.screen_index,
          screen_title: screen.screen_title,
          screen_role: screen.screen_role,
          learning_goal: screen.learning_goal,
          narrative_function: screen.narrative_function
        }))
      }
    };
  }

  function mergeUC5R3DSlotPayloadSeeds(templateBoundBlueprint, shardResults, plan) {
    const expectedIds = [];
    const sectionOrder = new Map();
    const screens = Array.isArray(templateBoundBlueprint?.screen_blueprints) ? templateBoundBlueprint.screen_blueprints : [];
    for (const screen of screens) {
      const positions = Array.isArray(screen.skeleton_positions) ? screen.skeleton_positions : [];
      positions.forEach((_, positionIndex) => {
        const id = buildUC5SectionContractId(screen.screen_index, positionIndex);
        sectionOrder.set(id, expectedIds.length);
        expectedIds.push(id);
      });
    }

    const sections = [];
    const weak = new Set();
    for (const result of shardResults) {
      const seed = result.slot_payload_seed;
      const seedSections = Array.isArray(seed?.sections) ? seed.sections : [];
      for (const section of seedSections) sections.push(section);
      const weakSections = Array.isArray(seed?.source_grounding_audit?.weak_or_insufficient_sections)
        ? seed.source_grounding_audit.weak_or_insufficient_sections
        : [];
      weakSections.forEach(id => weak.add(id));
    }

    sections.sort((a, b) => (sectionOrder.get(a.source_contract_id) ?? 9999) - (sectionOrder.get(b.source_contract_id) ?? 9999));

    const counts = new Map();
    for (const section of sections) {
      counts.set(section.source_contract_id, (counts.get(section.source_contract_id) || 0) + 1);
    }
    const got = new Set(sections.map(section => section.source_contract_id));
    const missing = expectedIds.filter(id => !got.has(id));
    const unexpected = sections.map(section => section.source_contract_id).filter(id => !sectionOrder.has(id));
    const duplicates = Array.from(counts.entries()).filter(([, count]) => count > 1).map(([id]) => id);

    const firstSeed = shardResults.find(result => result.slot_payload_seed)?.slot_payload_seed || {};
    const sourceHandle = uc5SourceHandleData || {};
    const sourceLineage = firstSeed.source_lineage || {
      source_type: 'foundry_vector_store',
      vector_store_id: sourceHandle.vector_store_id || templateBoundBlueprint?.source_lineage?.vector_store_id || '',
      file_id: sourceHandle.file_id || templateBoundBlueprint?.source_lineage?.file_id || '',
      source_file_name: sourceHandle.file_profile?.file_name || templateBoundBlueprint?.source_lineage?.source_file_name || ''
    };

    const slotPayloadSeed = {
      slot_payload_seed_version: 'uc5_slot_payload_seed.responses.v1',
      slot_payload_seed_status: 'ready_for_deterministic_assembly',
      source_lineage: sourceLineage,
      sections,
      source_grounding_audit: {
        file_search_used: true,
        section_count: sections.length,
        weak_or_insufficient_sections: Array.from(weak),
        grounding_notes: `Merged from ${shardResults.length} R3D shard responses in the frontend orchestrator.`
      }
    };

    const validationStatus = missing.length || unexpected.length || duplicates.length ? 'failed' : 'pass';
    return {
      workflow_response_version: 'uc5_w03_slot_payload_sharded_merge.frontend.r3d.v1',
      status: validationStatus === 'pass' ? 'success' : 'validation_failed',
      validation_status: validationStatus,
      execution_mode: 'frontend_dynamic_sharded_multi_call',
      shard_policy: {
        screens_per_shard: plan.screens_per_shard,
        max_sections_per_shard: plan.max_sections_per_shard,
        execution_parameters_owner: 'n8n'
      },
      shard_count: plan.shard_count,
      successful_shard_count: shardResults.length,
      failed_shard_count: 0,
      expected_section_count: expectedIds.length,
      actual_section_count: sections.length,
      missing_section_count: missing.length,
      unexpected_section_count: unexpected.length,
      duplicate_section_count: duplicates.length,
      missing_section_ids: missing,
      unexpected_section_ids: unexpected,
      duplicate_section_ids: duplicates,
      slot_payload_seed: validationStatus === 'pass' ? slotPayloadSeed : null,
      slot_payload_seed_draft: slotPayloadSeed,
      source_handle: sourceHandle,
      source_coverage_summary: slotPayloadSeed.source_grounding_audit,
      validation_result: { status: validationStatus, errors: [] },
      frontend_handoff: { assembly_strategy: 'merge_blueprint_static_contract_with_slot_payload_seed' },
      shard_results: shardResults.map(result => ({
        shard_id: result.shard_id,
        screen_indexes: result.screen_indexes,
        expected_section_count: result.expected_section_count,
        actual_section_count: Array.isArray(result.slot_payload_seed?.sections) ? result.slot_payload_seed.sections.length : 0,
        status: result.status,
        validation_status: result.validation_status
      }))
    };
  }

  async function requestUC5SlotPayloadSeedR3D(templateBoundBlueprint) {
    const plan = buildUC5R3DShardPlan(templateBoundBlueprint);
    const shardResults = [];

    console.info('[UC5 R3D] W03 dynamic shard plan', {
      shard_count: plan.shard_count,
      expected_section_count: plan.expected_section_count,
      execution_parameters_owner: 'n8n'
    });

    for (const shard of plan.shards) {
      const shardBlueprint = buildUC5R3DShardBlueprint(templateBoundBlueprint, shard);
      const shardPolicyBundle = await buildUC5PayloadPolicyBundle(shardBlueprint);
      const formData = await buildUC5SlotPayloadSeedFormDataForBlueprint(shardBlueprint, shardPolicyBundle);

      if (uc5LoadingText) uc5LoadingText.textContent = `학습 내용을 작성하는 중입니다... (${shard.shard_index}/${plan.shard_count})`;
      if (uc5LoadingSubtext) {
        uc5LoadingSubtext.textContent = `현재 화면 ${shard.screen_indexes.join(', ')} · sections ${shard.expected_section_count}개 · components ${shard.components.join(', ')}`;
      }

      const shardResponse = await postUC5Workflow(
        CONFIG.UC5_W03_WEBHOOK,
        formData,
        `${shard.shard_id} 학습 내용 작성 실패`
      );
      const shardPayload = getUC5ResponsePayload(shardResponse);
      const shardSeed = getUC5SlotPayloadSeed(shardResponse);

      if (shardPayload.validation_status !== 'pass' || !shardSeed) {
        throw new Error(`${shard.shard_id} 검증 실패: W03 shard 응답을 확인해 주세요.`);
      }

      shardResults.push({
        shard_id: shard.shard_id,
        shard_index: shard.shard_index,
        screen_indexes: shard.screen_indexes,
        expected_section_count: shard.expected_section_count,
        components: shard.components,
        status: shardPayload.status || 'success',
        validation_status: shardPayload.validation_status || 'pass',
        slot_payload_seed: shardSeed,
        response_payload: shardPayload
      });
    }

    const merged = mergeUC5R3DSlotPayloadSeeds(templateBoundBlueprint, shardResults, plan);
    if (merged.validation_status !== 'pass') {
      throw new Error(`R3D 병합 검증 실패: missing=${merged.missing_section_count}, unexpected=${merged.unexpected_section_count}, duplicate=${merged.duplicate_section_count}`);
    }
    return merged;
  }

  async function requestUC5FinalPreviewFromBlueprint() {
    if (!uc5TemplateBoundBlueprintData) {
      alert('먼저 교육 화면 설계안을 만들어 주세요.');
      return;
    }

    const finalBtn = previewStage?.querySelector('[data-uc5-action="create-final-preview"]');
    const regenerateBtn = previewStage?.querySelector('[data-uc5-action="regenerate-blueprint"]');

    if (finalBtn) {
      finalBtn.disabled = true;
      finalBtn.textContent = '최종 미리보기 만드는 중...';
    }

    if (regenerateBtn) {
      regenerateBtn.disabled = true;
    }

    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }

    try {
      setUC5PipelineStatus('payload', 'active');
      setUC5LoadingCopy('payload');
      scheduleUC5PreviewFit();

      const payloadResponse = await requestUC5SlotPayloadSeedR3D(uc5TemplateBoundBlueprintData);

      const slotPayload = getUC5ResponsePayload(payloadResponse);
      uc5SlotPayloadSeedData = getUC5SlotPayloadSeed(payloadResponse);
      uc5SourceCoverageSummaryData = getUC5SourceCoverageSummary(payloadResponse);

      if (slotPayload.validation_status !== 'pass' || !uc5SlotPayloadSeedData) {
        throw new Error('학습 내용 검증에 실패했습니다. 원문 근거 또는 화면 내용을 확인해 주세요.');
      }

      setUC5PipelineStatus('render', 'active');
      setUC5LoadingCopy('assembly');
      scheduleUC5PreviewFit();

      const renderPlan = assembleUC5RenderPlan(
        uc5TemplateBoundBlueprintData,
        uc5SlotPayloadSeedData,
        uc5SourceCoverageSummaryData
      );

      setUC5PipelineStatus('render', 'done');
      renderUC5RenderPlan(renderPlan, { persist: true });
    } catch (err) {
      console.error(err);
      setUC5PipelineStatus(uc5PipelineStatus || 'payload', 'error');

      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }

      if (finalBtn) {
        finalBtn.disabled = false;
        finalBtn.textContent = '내용 작성하고 최종 미리보기 만들기';
      }

      if (regenerateBtn) {
        regenerateBtn.disabled = false;
      }

      alert(err.message || '최종 교육 미리보기 생성 중 오류가 발생했습니다.');
    }
  }

  async function requestUC5RenderPlanFromApprovedDraft() {
    await requestUC5TemplateBlueprintFromCurrentSelection();
  }

  function renderUC5PlanningDraft(plan) {
    uc5PlanningDraftData = plan;
    uc5CurrentUiSelectionData = getUC5CurrentUiSelectionFromDraft(plan);
    uc5TemplateBoundBlueprintData = null;
    uc5SlotPayloadSeedData = null;
    uc5SourceCoverageSummaryData = null;
    uc5SlidesData = null;
    uc5RenderPlanData = null;
    uc5SavedHtmlPreviewData = null;
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};

    if (confettiTimer) {
      cancelAnimationFrame(confettiTimer);
      confettiTimer = null;
    }

    const selection = uc5CurrentUiSelectionData || {};
    const narrative = plan?.narrative_preview || {};
    const profile = plan?.source_content_profile || {};
    const rationale = plan?.recommendation_rationale || {};
    const screens = Array.isArray(narrative.screen_outline) ? narrative.screen_outline : [];
    const reviewItems = Array.isArray(plan?.admin_review_items) ? plan.admin_review_items : [];

    const selectedShell = selection.macro_shell_id || selection.narrative_choice || 'AI 추천';
    const templateId = selection.template_id || '-';
    const screenCount = selection.screen_count || screens.length || '-';
    const density = selection.content_density || '-';
    const confidence = rationale.decision_confidence || '-';

    if (selection.macro_shell_id && UC5_MACRO_SHELL_META[selection.macro_shell_id]) {
      applyUC5SelectionToControls(selection);
    } else {
      updateUC5LearningConditionState();
    }

    const screenHtml = screens.slice(0, 12).map((screen, idx) => {
      const index = screen.screen_index || idx + 1;
      const title = screen.screen_title || screen.suggested_screen_role || `화면 ${index}`;
      const goal = screen.learning_goal || screen.narrative_function || '';
      const role = screen.suggested_screen_role || 'learning';

      return `
        <div class="uc5-planning-screen-item">
          <div class="uc5-planning-screen-index">${escapeHtml(index)}</div>
          <div class="uc5-planning-screen-copy">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(goal)}</span>
          </div>
          <div class="uc5-planning-component-pill">${escapeHtml(role)}</div>
        </div>
      `;
    }).join('');

    const reviewHtml = reviewItems.length > 0
      ? reviewItems.slice(0, 5).map(item => `
          <li>
            <strong>${escapeHtml(item.review_item || '검토 항목')}</strong>
            <span>${escapeHtml(item.recommended_admin_action || item.reason || '')}</span>
          </li>
        `).join('')
      : '<li><strong>관리자 검토</strong><span>추천된 구성 방식, 화면 수, 학습 흐름이 의도와 맞는지 확인하세요.</span></li>';

    if (paginationFooter) {
      paginationFooter.style.display = 'none';
    }

    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    if (activeLayoutText) {
      activeLayoutText.textContent = `AI 추천 적용 · ${selectedShell}`;
    }

    setUC5PipelineStatus('planning', 'done');

    previewStage.innerHTML = `
      <div class="uc5-planning-review uc5-fade-in-up">
        <div class="uc5-planning-review-head">
          <div>
            <div class="uc5-planning-review-kicker">AI가 추천한 교육 구성</div>
            <h3>${escapeHtml(narrative.lesson_title || '교육 기획안 검토')}</h3>
            <p class="uc5-planning-review-subtitle">
              ${escapeHtml(narrative.lesson_subtitle || narrative.learner_promise || '원문 PDF와 관리자 조건을 바탕으로 교육 흐름을 제안했습니다.')}
            </p>
          </div>
          <div class="uc5-planning-status-badge">추천 적용됨</div>
        </div>

        <div class="uc5-planning-summary-grid">
          <div class="uc5-planning-summary-card">
            <span>추천 구성</span>
            <strong>${escapeHtml(selectedShell)}</strong>
          </div>
          <div class="uc5-planning-summary-card">
            <span>화면 수</span>
            <strong>${escapeHtml(screenCount)}</strong>
          </div>
          <div class="uc5-planning-summary-card">
            <span>분량</span>
            <strong>${escapeHtml(density)}</strong>
          </div>
          <div class="uc5-planning-summary-card">
            <span>추천 신뢰도</span>
            <strong>${escapeHtml(confidence)}</strong>
          </div>
        </div>

        <div class="uc5-planning-review-note uc5-planning-template-note">
          <strong>적용될 화면 구조:</strong> ${escapeHtml(templateId)}
        </div>

        <div class="uc5-planning-screen-list">
          ${screenHtml || `
            <div class="uc5-planning-screen-item">
              <div class="uc5-planning-screen-index">!</div>
              <div class="uc5-planning-screen-copy">
                <strong>화면 흐름 없음</strong>
                <span>기획안 응답에 화면별 흐름이 포함되지 않았습니다.</span>
              </div>
              <div class="uc5-planning-component-pill">missing</div>
            </div>
          `}
        </div>

        <div class="uc5-planning-review-note">
          <strong>원문 유형:</strong> ${escapeHtml(profile.detected_primary_structure || '-')} · ${escapeHtml((profile.detected_secondary_structures || []).join(', ') || '-')}
        </div>

        <ul class="uc5-admin-review-list">
          ${reviewHtml}
        </ul>

        <div class="uc5-planning-review-actions">
          <button
            type="button"
            class="uc5-review-btn uc5-review-btn-ghost"
            data-uc5-action="back-to-input"
          >
            조건 수정
          </button>

          <button
            type="button"
            class="uc5-review-btn uc5-review-btn-secondary"
            data-uc5-action="regenerate-planning"
          >
            기획안 다시 만들기
          </button>

          <button
            type="button"
            class="uc5-review-btn uc5-review-btn-primary"
            data-uc5-action="approve-planning"
          >
            이 구성으로 교육 기획안 만들기
          </button>
        </div>

        <div class="uc5-planning-next-note">
          다음 단계에서 화면별 구성과 콘텐츠 영역을 설계합니다.
        </div>
      </div>
    `;
    scheduleUC5PreviewFit();
    updateUC5LearningConditionState();
    validateUC5RunBtn();
  }

  if (previewStage) {
    previewStage.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-uc5-action]');
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-uc5-action');

      if (action === 'approve-planning') {
        e.preventDefault();
        requestUC5TemplateBlueprintFromCurrentSelection();
        return;
      }

      if (action === 'create-final-preview') {
        e.preventDefault();
        requestUC5FinalPreviewFromBlueprint();
        return;
      }

      if (action === 'regenerate-planning') {
        e.preventDefault();
        requestUC5AiRecommendation();
        return;
      }

      if (action === 'regenerate-blueprint') {
        e.preventDefault();
        requestUC5TemplateBlueprintFromCurrentSelection();
        return;
      }

      if (action === 'back-to-input') {
        e.preventDefault();

        if (window.scrollTo) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (activeLayoutText) {
          activeLayoutText.textContent = '조건 수정 대기';
        }

        updateUC5LearningConditionState();
        return;
      }
    });
  }

  async function requestUC5AiRecommendation() {
    if (!uc5UploadedFile) {
      alert('교육 원문 PDF를 먼저 업로드해 주세요.');
      return;
    }

    setUC5PipelineStatus('planning', 'active');
    setUC5LoadingCopy('planning');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    scheduleUC5PreviewFit();
    if (paginationFooter) paginationFooter.style.display = 'none';
    if (previewStage) previewStage.innerHTML = '';

    if (uc5AiRecommendBtn) {
      uc5AiRecommendBtn.disabled = true;
      uc5AiRecommendBtn.textContent = '분석 중...';
    }

    if (uc5RunBtn) {
      uc5RunBtn.disabled = true;
    }

    uc5PlanningDraftData = null;
    uc5CurrentUiSelectionData = null;
    uc5TemplateBoundBlueprintData = null;
    uc5SlotPayloadSeedData = null;
    uc5SourceCoverageSummaryData = null;
    uc5RenderPlanData = null;
    uc5SavedHtmlPreviewData = null;
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};

    try {
      const data = await postUC5Workflow(
        CONFIG.UC5_W01_WEBHOOK,
        await buildUC5PlanningFormData(),
        'AI 추천 생성 실패'
      );

      const payload = getUC5ResponsePayload(data);
      const draft = getUC5NarrativePlanningDraft(data);

      if (payload.validation_status !== 'pass' || !draft) {
        throw new Error('AI 추천 결과 검증에 실패했습니다. 응답 내용을 확인해 주세요.');
      }

      renderUC5PlanningDraft(draft);
    } catch (err) {
      console.error(err);
      setUC5PipelineStatus('planning', 'error');
      if (loadingOverlay) loadingOverlay.style.display = 'none';

      if (previewStage) {
        previewStage.innerHTML = `
          <div class="uc5-empty-preview">
            <span class="uc5-empty-icon" style="color: var(--danger);">⚠️</span>
            <h3 style="color: var(--danger);">AI 추천 생성 실패</h3>
            <p>${escapeHtml(err.message || '네트워크 통신 중 에러가 발생했습니다.')}</p>
          </div>
        `;
        scheduleUC5PreviewFit();
      }
    } finally {
      if (uc5AiRecommendBtn) {
        uc5AiRecommendBtn.disabled = !uc5UploadedFile;
        uc5AiRecommendBtn.textContent = '추천 받기';
      }
      validateUC5RunBtn();
      updateUC5LearningConditionState();
    }
  }

  if (uc5AiRecommendBtn) {
    uc5AiRecommendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      macroShellInputs.forEach((input) => {
        input.checked = input.value === 'auto';
      });
      setUC5SelectedMacroShell('auto');
      requestUC5AiRecommendation();
    });
  }

  // 9. Asynchronous Request Dispatcher (교육 기획안 생성)
  if (uc5RunBtn) {
    uc5RunBtn.addEventListener('click', async () => {
      if (!uc5UploadedFile) return;

      const selectedMode = getUC5SelectedMacroShell();

      if (selectedMode === 'auto' && !(uc5PlanningDraftData && uc5CurrentUiSelectionData)) {
        alert('AI 추천을 먼저 받아 주세요. 직접 지정하려면 개념 이해형, 업무 절차형, 상황 판단형 중 하나를 선택하세요.');
        validateUC5RunBtn();
        return;
      }

      await requestUC5TemplateBlueprintFromCurrentSelection();
    });
  }

  // 10. Slide Pagination Handlers
  prevBtn.addEventListener('click', () => {
    if (uc5ActivePageIndex > 1) {
      uc5ActivePageIndex--;
      renderUC5Slide();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (uc5ActivePageIndex < 5) {
      uc5ActivePageIndex++;
      renderUC5Slide();
    }
  });

  function updatePaginationUI() {
    pageIndicator.textContent = `화면 ${uc5ActivePageIndex} / 5`;
    prevBtn.disabled = (uc5ActivePageIndex === 1);
    nextBtn.disabled = (uc5ActivePageIndex === 5);
  }

  // 11. Event Delegation Pattern inside permanent Stage `#uc5-previewStage`
  if (previewStage) {
    previewStage.addEventListener('click', (e) => {
      const uc5V2PrevBtn = e.target.closest('.uc5-v2-prev-btn');
      if (uc5V2PrevBtn) {
        if (uc5SavedHtmlPreviewData && uc5RenderPlanScreenIndex > 0) {
          uc5RenderPlanScreenIndex--;
          renderUC5SavedHtmlCurrentScreen();
        } else if (uc5RenderPlanData && uc5RenderPlanScreenIndex > 0) {
          uc5RenderPlanScreenIndex--;
          renderUC5V2CurrentScreen();
        }
        return;
      }

      const uc5V2NextBtn = e.target.closest('.uc5-v2-next-btn');
      if (uc5V2NextBtn) {
        if (uc5SavedHtmlPreviewData) {
          const screenCount = Array.isArray(uc5SavedHtmlPreviewData.screens) ? uc5SavedHtmlPreviewData.screens.length : 0;
          if (uc5RenderPlanScreenIndex < screenCount - 1) {
            uc5RenderPlanScreenIndex++;
            renderUC5SavedHtmlCurrentScreen();
          } else {
            triggerConfetti();
          }
        } else if (uc5RenderPlanData) {
          const screenCount = getUC5RenderPlanScreenCount();
          if (uc5RenderPlanScreenIndex < screenCount - 1) {
            uc5RenderPlanScreenIndex++;
            renderUC5V2CurrentScreen();
          } else {
            triggerConfetti();
          }
        }
        return;
      }

      const uc5V2CheckItem = e.target.closest('.uc5-rp-check-item');
      if (uc5V2CheckItem) {
        uc5V2CheckItem.classList.toggle('is-complete');
        return;
      }

      const uc5V2QuizOption = e.target.closest('.uc5-rp-quiz-option');
      if (uc5V2QuizOption) {
        const quizBlock = uc5V2QuizOption.closest('.uc5-rp-quiz-block');
        const feedbackBox = quizBlock?.querySelector('.uc5-rp-quiz-feedback');
        const isCorrect = uc5V2QuizOption.dataset.uc5RpCorrect === 'true';
        const feedback = uc5V2QuizOption.dataset.uc5RpFeedback || '';

        quizBlock?.querySelectorAll('.uc5-rp-quiz-option').forEach(option => {
          option.classList.remove('is-correct', 'is-wrong');
        });

        uc5V2QuizOption.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        if (feedbackBox) {
          feedbackBox.textContent = feedback || (isCorrect ? '정답입니다.' : '다시 확인해 보세요.');
          feedbackBox.classList.toggle('is-correct', isCorrect);
          feedbackBox.classList.toggle('is-wrong', !isCorrect);
        }
        if (isCorrect) triggerConfetti();
        return;
      }

      // A. Layout 1 Matrix Card Click Flipping
      const flipCard = e.target.closest('.uc5-flip-card');
      if (flipCard) {
        flipCard.classList.toggle('flipped');
        return;
      }

      // B. Layout 2 Journey Node Clicking
      const journeyNode = e.target.closest('.uc5-journey-node');
      if (journeyNode) {
        const nodeId = journeyNode.dataset.node;
        const activeSlide = uc5SlidesData[uc5ActivePageIndex - 1];

        // Update Active Pin Highlight
        document.querySelectorAll('.uc5-journey-node').forEach(n => n.classList.remove('active'));
        journeyNode.classList.add('active');

        // Progress Connector Line
        const progressLine = document.getElementById('uc5-journeyProgressLine');
        if (progressLine) {
          const progressValues = { '1': '20', '2': '130', '3': '290', '4': '500' };
          progressLine.style.strokeDasharray = `${progressValues[nodeId]} 500`;
        }

        // Update Detail Box Content
        const titleEl = document.querySelector('#uc5-journeyDetailCard .uc5-journey-step-title');
        const badgeEl = document.querySelector('#uc5-journeyDetailCard .uc5-journey-step-badge');
        const bodyEl = document.querySelector('#uc5-journeyDetailCard .uc5-journey-detail-body');

        badgeEl.textContent = `STEP ${nodeId}`;
        if (nodeId === '1') {
          titleEl.textContent = '핵심 도입부 및 개요';
          bodyEl.textContent = activeSlide.body_segments[0] || '';
        } else if (nodeId === '2') {
          titleEl.textContent = '세부 실무 로드맵';
          bodyEl.textContent = activeSlide.body_segments[1] || '';
        } else if (nodeId === '3') {
          titleEl.textContent = '비주얼 인포그래픽 디자인';
          bodyEl.textContent = activeSlide.graphic_prompt || '';
        } else {
          titleEl.textContent = '과제 이수 가이드';
          bodyEl.textContent = '본 교육 핵심 요약을 토대로 소속 팀원들과 업무 프로세스 개선 회의를 진행하고, 분기별 이수 평가 실습 과제를 제출하십시오.';
        }

        const detailCard = document.getElementById('uc5-journeyDetailCard');
        detailCard.classList.remove('uc5-fade-in');
        void detailCard.offsetWidth; // Force Reflow
        detailCard.classList.add('uc5-fade-in');
        return;
      }

      // C. Layout 3 Split Tab Clicking
      const splitTab = e.target.closest('.uc5-split-tab');
      if (splitTab) {
        const tabId = splitTab.dataset.tab;
        const activeSlide = uc5SlidesData[uc5ActivePageIndex - 1];

        // Highlight Tab
        document.querySelectorAll('.uc5-split-tab').forEach(t => t.classList.remove('active'));
        splitTab.classList.add('active');

        const contentTitle = document.querySelector('#uc5-splitTabContent .uc5-split-content-title');
        const contentBody = document.querySelector('#uc5-splitTabContent .uc5-split-content-body');

        if (tabId === 'solution') {
          contentTitle.textContent = '💡 프로세스 실행 및 세부 전략';
          contentBody.textContent = activeSlide.body_segments[1] || '';
        } else if (tabId === 'visual') {
          contentTitle.textContent = '🎨 시각 디자인 및 테마 가이드';
          contentBody.textContent = activeSlide.graphic_prompt || '';
        } else {
          contentTitle.textContent = '📈 기대 효과 및 재무 성과';
          contentBody.textContent = '본 실행 솔루션을 도입할 경우, 수작업 처리 속도가 최대 350% 향상되며, 업무 오류율이 0.1% 미만으로 감소하는 실질적인 비용 절감과 신뢰도 향상 효과를 거두게 됩니다.';
        }

        const tabContent = document.getElementById('uc5-splitTabContent');
        tabContent.classList.remove('uc5-fade-in');
        void tabContent.offsetWidth; // Force Reflow
        tabContent.classList.add('uc5-fade-in');
        return;
      }

      // D. Slide 5 Quiz Option Clicking & Confetti Spray / Shake Evaluators
      const quizOption = e.target.closest('.uc5-quiz-option');
      if (quizOption) {
        const chosen = quizOption.dataset.option;
        const activeSlide = uc5SlidesData[4]; // slide 5 is indexed 4
        const correct = String(activeSlide.correct_option || activeSlide.correct_answer || 'A').trim().toUpperCase();

        const feedbackBox = document.getElementById('uc5-quizFeedback');
        const fbTitle = document.getElementById('uc5-feedbackTitle');
        const fbText = document.getElementById('uc5-feedbackText');

        document.querySelectorAll('.uc5-quiz-option').forEach(opt => {
          opt.classList.remove('correct', 'wrong');
        });

        if (chosen === correct) {
          quizOption.classList.add('correct');
          fbTitle.textContent = '정답입니다! 🎉';
          fbTitle.style.color = 'var(--success)';
          fbText.textContent = activeSlide.explanation || '개념을 완벽히 소화하셨습니다!';
          feedbackBox.style.display = 'block';

          feedbackBox.classList.remove('uc5-fade-in');
          void feedbackBox.offsetWidth;
          feedbackBox.classList.add('uc5-fade-in');

          // Trigger Confetti using triggerConfetti()
          triggerConfetti();
        } else {
          quizOption.classList.add('wrong');
          fbTitle.textContent = '아쉽게도 오답입니다. 😢';
          fbTitle.style.color = 'var(--danger)';
          fbText.textContent = '다시 한 번 고민해보고 알맞은 보기를 선택해보세요.';
          feedbackBox.style.display = 'block';

          feedbackBox.classList.remove('uc5-fade-in');
          void feedbackBox.offsetWidth;
          feedbackBox.classList.add('uc5-fade-in');

          // Trigger shake animation
          quizOption.classList.remove('uc5-shake');
          void quizOption.offsetWidth; // Reflow
          quizOption.classList.add('uc5-shake');
          setTimeout(() => {
            quizOption.classList.remove('uc5-shake');
          }, 600);
        }
      }

      // E. Inner Pagination Previous Button Click
      const prevBtnInner = e.target.closest('.prev-slide-btn');
      if (prevBtnInner) {
        if (uc5ActivePageIndex > 1) {
          uc5ActivePageIndex--;
          renderUC5Slide();
        }
        return;
      }

      // F. Inner Pagination Next Button Click
      const nextBtnInner = e.target.closest('.next-slide-btn');
      if (nextBtnInner) {
        if (uc5ActivePageIndex < 5) {
          uc5ActivePageIndex++;
          renderUC5Slide();
        } else if (uc5ActivePageIndex === 5) {
          triggerConfetti();
          alert('🎉 축하합니다! 임직원 교육 과정을 성공적으로 이수하셨습니다.');
        }
        return;
      }
    });
  }

  // 12. Lightweight Built-in HTML5 Confetti Canvas Engine (triggerConfetti)
  function triggerConfetti() {
    const canvas = document.getElementById('uc5-confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
    const particles = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -120 - 20,
        r: Math.random() * 5 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 8 - 4,
        tiltAngleIncremental: Math.random() * 0.08 + 0.02,
        tiltAngle: 0,
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 2.5 + 2.5
      });
    }

    if (confettiTimer) cancelAnimationFrame(confettiTimer);

    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach(p => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.vy;
        p.x += p.vx;
        p.tilt = Math.sin(p.tiltAngle) * 6;

        if (p.y < canvas.height + 15) {
          active = true;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      if (active) {
        confettiTimer = requestAnimationFrame(drawFrame);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    drawFrame();
  }



  // ==========================================
  // 🧾 Use Case 6: FetchDoc browser-admin control plane
  // ==========================================
  const UC6_STORAGE_KEY = 'fetchdoc.uc6.browser_admin_control_plane.v1';
  const UC6_FIREBASE_SDK_VERSION = '10.14.1';
  const UC6_POLL_INTERVAL_MS = 3500;
  const UC6_MAX_TRANSIENT_ERRORS = 3;
  const UC6_AUTHORIZED_LABEL = '승인된 FetchDoc 관리자';
  const UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA = 'uc6_a9_0g2a_r6d2b_browser_admin_dummy_databag_package_family_options_v1';

  const UC6_AUTH_COPY = {
    initializing: ['초기화 중', 'Firebase Auth와 FetchDoc 관리자 세션을 준비하고 있습니다.'],
    signed_out: ['로그인 필요', 'Google 계정으로 로그인한 뒤 FetchDoc 관리자 권한을 확인하세요.'],
    authenticating: ['로그인 진행 중', 'Firebase sign-in 흐름을 처리하고 있습니다.'],
    authorizing: ['권한 확인 중', 'FetchDoc browser-admin 세션 권한을 확인하고 있습니다.'],
    authorized: ['관리자 승인 완료', '새 PPTX 등록 또는 게시된 reusable Asset 기반 문서 생성을 진행할 수 있습니다.'],
    access_denied: ['접근 거부', 'FetchDoc 관리자 권한이 확인되지 않았습니다.'],
    temporarily_unavailable: ['일시적 사용 불가', '관리자 세션 확인을 잠시 후 다시 시도하세요.']
  };

  const UC6_STATE_LABELS = {
    source_ready: '소스 준비 완료',
    onboarding_queued: 'Fresh onboarding 대기 중',
    onboarding_running: 'Fresh onboarding 실행 중',
    onboarding_ready: 'Fresh onboarding 준비 완료',
    onboarding_blocked: 'Fresh onboarding 차단',
    synthetic_scenarios_queued: '합성 샘플 컨텍스트 생성 대기 중',
    synthetic_scenarios_running: '합성 샘플 컨텍스트 생성 중',
    synthetic_scenarios_ready: '합성 샘플 컨텍스트 선택 준비 완료',
    synthetic_scenario_bound: '합성 샘플 컨텍스트 선택 완료',
    synthetic_scenarios_failed: '합성 샘플 컨텍스트 생성 실패',
    render_queued: '생성 대기 중',
    render_running: '생성 실행 중',
    render_completed: '생성 완료',
    analysis_queued: '분석 대기 중',
    analysis_running: '분석 실행 중',
    failed: '작업 실패',
    review_ready: '검토 준비 완료',
    review_ready_with_warnings: '경고 포함 검토 준비',
    review_blocked: '검토 차단',
    approved: '승인 완료',
    revision_requested: '수정 요청 완료',
    rejected: '반려 완료'
  };

  const UC6_DECISION_LABELS = {
    approve: '승인',
    request_revision: '수정 요청',
    reject: '거절'
  };

  const UC6_STAGE_STEPS = [
    { key: 'intake', label: 'PPTX 등록' },
    { key: 'analysis', label: '분석' },
    { key: 'review', label: '결과 검토' },
    { key: 'decision', label: '결정' },
    { key: 'complete', label: '완료' }
  ];

  const UC6_A8E_STAGE_STEPS = [
    { key: 'intake', label: 'PPTX 등록' },
    { key: 'package', label: '데이터 선택' },
    { key: 'render', label: '문서 생성' },
    { key: 'result', label: '결과 확인' },
    { key: 'publication', label: '승인·게시' }
  ];

  const UC6_A8H_STAGE_STEPS = [
    { key: 'asset', label: 'Asset 선택' },
    { key: 'package', label: '데이터 선택' },
    { key: 'render', label: '문서 생성' },
    { key: 'result', label: '결과·다운로드' }
  ];

  const UC6_R6E_D2_STAGE_STEPS = [
    { key: 'intake', label: 'PPTX 등록' },
    { key: 'package', label: '샘플 선택' },
    { key: 'render', label: '문서 생성' },
    { key: 'result', label: '결과·다운로드' }
  ];

  const uc6State = {
    authStatus: 'initializing',
    firebaseClient: null,
    firebaseUser: null,
    api: null,
    session: null,
    jobId: '',
    jobState: '',
    flowLane: 'dummy_render',
    reusableAssetCatalog: null,
    reusableAssetCatalogStatus: 'idle',
    selectedAssetId: '',
    assetPackageOptions: null,
    assetSourceLane: 'static_package',
    linkedScenarioFamily: null,
    linkedScenarioFamilyStatus: 'idle',
    linkedScenarioFamilyMessage: '',
    selectedPublishedScenarioFamilyId: '',
    selectedPublishedScenarioKey: '',
    assetSubmissionAmbiguous: false,
    packageOptions: null,
    freshOnboardingExpected: false,
    onboardingSubmissionAmbiguous: false,
    freshSyntheticExpected: false,
    syntheticGenerationSubmission: null,
    syntheticGenerationSubmitted: false,
    syntheticGenerationSubmissionAmbiguous: false,
    syntheticScenarioOptions: [],
    syntheticGenerationState: 'not_started',
    syntheticSelectionState: 'unbound',
    boundSyntheticScenario: null,
    selectedSyntheticScenarioKey: '',
    syntheticBindingSubmissionAmbiguous: false,
    freshRenderSubmitted: false,
    freshRenderSubmissionAmbiguous: false,
    selectedPackageFamilyId: '',
    selectedPackageId: '',
    selectedPackageVersion: '',
    renderStatus: null,
    reviewArtifacts: null,
    reviewArtifactsStatus: 'idle',
    reviewArtifactsMessage: '',
    reviewArtifactDownloadActive: '',
    reviewArtifactDownloadMessage: '',
    reviewArtifactDownloadAbortController: null,
    publication: null,
    publicationStatus: 'idle',
    publicationMessage: '',
    publicationDecisionIdentity: '',
    publicationReviewConfirmed: false,
    publicationNoteDraft: '',
    source: null,
    review: null,
    decision: null,
    selectedFile: null,
    operationInFlight: false,
    analysisSubmittedForJobId: '',
    decisionSubmitted: false,
    decisionMode: false,
    decisionChoiceValue: 'approve',
    reviewNotesDraft: '',
    requestedRevisionsDraft: '',
    stageMessage: '',
    reviewMessage: '',
    decisionMessage: '',
    finalDelivery: null,
    finalDeliveryStatus: 'idle',
    finalDeliveryMessage: '',
    finalDeliveryRequestActive: false,
    liveMessage: '',
    lastRenderedStage: '',
    pollingTimer: null,
    pollingAbortController: null,
    operationAbortController: null,
    finalDeliveryAbortController: null,
    reviewSurfaceAbortController: null,
    reviewSurfaceRequestActive: false,
    publicationAbortController: null,
    publicationRequestActive: false,
    statusRequestActive: false,
    consecutivePollErrors: 0,
    lastPollingTimestamp: 0
  };

  const uc6Els = {
    section: document.getElementById('view-uc6'),
    authStateChip: document.getElementById('uc6-authStateChip'),
    authStatus: document.getElementById('uc6-authStatus'),
    signInBtn: document.getElementById('uc6-signInBtn'),
    signOutBtn: document.getElementById('uc6-signOutBtn'),
    refreshSessionBtn: document.getElementById('uc6-refreshSessionBtn'),
    stepper: document.getElementById('uc6-stepper'),
    activeStageRoot: document.getElementById('uc6-activeStageRoot'),
    contextSummary: document.getElementById('uc6-contextSummary'),
    liveStatus: document.getElementById('uc6-liveStatus'),
    get fileInput() { return document.getElementById('uc6-pptxFileInput'); },
    get fileName() { return document.getElementById('uc6-selectedFileName'); },
    get uploadBtn() { return document.getElementById('uc6-uploadBtn'); },
    get uploadIndicator() { return document.getElementById('uc6-uploadIndicator'); },
    get clearBtn() { return document.getElementById('uc6-clearBtn'); },
    get analysisMessage() { return document.getElementById('uc6-analysisMessage'); },
    get pollingChip() { return document.getElementById('uc6-pollingChip'); },
    get retryAnalysisBtn() { return document.getElementById('uc6-retryAnalysisBtn'); },
    get resumePollingBtn() { return document.getElementById('uc6-resumePollingBtn'); },
    get reviewStatus() { return document.getElementById('uc6-reviewStatus'); },
    get decisionChoice() { return document.getElementById('uc6-decisionChoice'); },
    get reviewNotes() { return document.getElementById('uc6-reviewNotes'); },
    get requestedRevisions() { return document.getElementById('uc6-requestedRevisions'); },
    get submitDecisionBtn() { return document.getElementById('uc6-submitDecisionBtn'); },
    get decisionStatus() { return document.getElementById('uc6-decisionStatus'); }
  };

  function uc6Text(value, fallback = '-') {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
    return String(value);
  }

  function setUc6Text(el, value, fallback = '-') {
    if (el) el.textContent = uc6Text(value, fallback);
  }

  function setUc6Chip(el, label, tone = 'neutral') {
    if (!el) return;
    el.textContent = label;
    el.className = `uc6-admin-chip is-${tone}`;
  }

  function setUC6LiveMessage(message) {
    uc6State.liveMessage = uc6Text(message, '');
    setUc6Text(uc6Els.liveStatus, uc6State.liveMessage, '');
  }

  function formatUc6Bytes(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function mapUC6PublicStateToStage({ authorizationState, publicState, decisionMode, flowLane, publicationState, selectedAssetId } = {}) {
    if (authorizationState !== 'authorized') return 'auth';
    const state = publicState || null;
    if (flowLane === 'dummy_render') {
      if (!state || state === 'idle') return 'intake';
      if (
        state === 'source_ready'
        || state === 'onboarding_queued'
        || state === 'onboarding_running'
        || state === 'onboarding_ready'
        || state === 'onboarding_blocked'
        || state === 'synthetic_scenarios_queued'
        || state === 'synthetic_scenarios_running'
        || state === 'synthetic_scenarios_ready'
        || state === 'synthetic_scenario_bound'
        || state === 'synthetic_scenarios_failed'
      ) return 'package';
      if (state === 'render_queued' || state === 'render_running') return 'render';
      if (state === 'render_unknown') return 'render_unknown';
      if (state === 'failed') return 'render_error';
      if (state === 'render_completed') return publicationState === 'published' ? 'publication' : 'result';
      return 'unavailable';
    }
    if (flowLane === 'asset_render') {
      if (state === 'render_queued' || state === 'render_running') return 'render';
      if (state === 'render_unknown') return 'render_unknown';
      if (state === 'failed') return 'render_error';
      if (state === 'render_completed') return 'result';
      return selectedAssetId ? 'package' : 'asset';
    }
    if (decisionMode === true && (state === 'review_ready' || state === 'review_ready_with_warnings' || state === 'review_blocked')) return 'decision';
    if (!state || state === 'idle' || state === 'source_ready') return 'intake';
    if (state === 'analysis_queued' || state === 'analysis_running') return 'analysis';
    if (state === 'failed') return 'analysis_error';
    if (state === 'review_ready' || state === 'review_ready_with_warnings' || state === 'review_blocked') return 'review';
    if (state === 'approved' || state === 'revision_requested' || state === 'rejected') return 'complete';
    return 'unavailable';
  }

  function getUC6PresentationStage() {
    return mapUC6PublicStateToStage({
      authorizationState: uc6State.authStatus,
      publicState: uc6State.jobState || null,
      decisionMode: uc6State.decisionMode,
      flowLane: uc6State.flowLane,
      publicationState: uc6State.publication?.publication_state || null,
      selectedAssetId: uc6State.selectedAssetId
    });
  }

  function boundedFilename(name) {
    const cleaned = String(name || '').replace(/[\\/\u0000-\u001f]/g, '').trim();
    if (!cleaned) return '';
    return cleaned.length > 90 ? `${cleaned.slice(0, 42)}...${cleaned.slice(-36)}` : cleaned;
  }

  function uc6MessageFromError(error) {
    if (error?.publicMessage) return error.publicMessage;
    if (error?.name === 'AbortError') return '요청이 취소되었습니다.';
    return UC6_GENERIC_PUBLIC_ERROR_MESSAGE;
  }

  function isUc6Authorized() {
    return uc6State.authStatus === 'authorized';
  }

  function validateUc6SessionContract(session) {
    const principal = session?.principal || {};
    return session?.status === 'authorized'
      && principal.authenticated === true
      && principal.authorized === true
      && principal.email_verified === true
      && principal.admin_claim === 'fetchdoc_admin';
  }

  function setUc6AuthState(status, message) {
    uc6State.authStatus = status;
    const copy = UC6_AUTH_COPY[status] || UC6_AUTH_COPY.temporarily_unavailable;
    setUc6Chip(uc6Els.authStateChip, copy[0], status === 'authorized' ? 'ready' : status === 'access_denied' ? 'danger' : status === 'temporarily_unavailable' ? 'warning' : 'neutral');
    setUc6Text(uc6Els.authStatus, message || copy[1]);
    setUC6LiveMessage(message || copy[1]);
    renderUC6All();
  }

  function createUc6Item(label, value) {
    const item = document.createElement('div');
    item.className = 'uc6-kv-item';
    const key = document.createElement('span');
    key.textContent = label;
    const val = document.createElement('strong');
    val.textContent = uc6Text(value);
    item.append(key, val);
    return item;
  }

  function createUc6Node(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function createUC6ActionButton(id, label, className = 'btn btn-outline', disabled = false) {
    const button = createUc6Node('button', className, label);
    button.type = 'button';
    button.id = id;
    button.disabled = disabled;
    return button;
  }

  function createUC6Field(labelText, control) {
    const label = createUc6Node('label', 'uc6-field');
    if (control.id) label.htmlFor = control.id;
    label.append(createUc6Node('span', '', labelText), control);
    return label;
  }

  function createUC6SummaryItem(label, value) {
    const item = createUc6Node('div', 'uc6-kv-item');
    item.append(createUc6Node('span', '', label), createUc6Node('strong', '', uc6Text(value, '')));
    return item;
  }

  function createUc6ListItem(value) {
    const li = document.createElement('li');
    li.textContent = uc6Text(value);
    return li;
  }

  function toUc6DisplayLines(value, preferredKeys = []) {
    if (Array.isArray(value)) return value.slice(0, 8).map(uc6Text);
    if (!value || typeof value !== 'object') return value ? [uc6Text(value)] : [];
    const lines = [];
    preferredKeys.forEach((key) => {
      if (value[key] !== undefined && value[key] !== null && value[key] !== '') lines.push(`${key}: ${uc6Text(value[key])}`);
    });
    if (lines.length) return lines.slice(0, 8);
    return Object.keys(value).slice(0, 6).map((key) => `${key}: ${uc6Text(value[key])}`);
  }

  function renderUc6List(el, values, emptyText) {
    if (!el) return;
    const lines = Array.isArray(values) ? values.filter((item) => item !== undefined && item !== null && item !== '') : [];
    if (!lines.length) {
      el.replaceChildren(createUc6ListItem(emptyText));
      return;
    }
    el.replaceChildren(...lines.slice(0, 8).map(createUc6ListItem));
  }

  function hasUC6Value(value) {
    return value !== undefined && value !== null && value !== '';
  }

  function appendUC6DetailSection(parent, title, lines) {
    const filtered = Array.isArray(lines) ? lines.filter(hasUC6Value) : [];
    if (!filtered.length) return;
    const section = createUc6Node('section', 'uc6-detail-group');
    section.append(createUc6Node('h3', '', title));
    const list = createUc6Node('ul', 'uc6-bounded-list');
    list.replaceChildren(...filtered.slice(0, 8).map(createUc6ListItem));
    section.append(list);
    parent.append(section);
  }

  function saveUC6LocalState() {
    try {
      const projected = projectUc6PersistedState({
        job_id: uc6State.jobId,
        last_known_public_state: uc6State.jobState,
        last_polling_timestamp: uc6State.lastPollingTimestamp,
        selected_panel: 'review',
        flow_lane: uc6State.flowLane,
        fresh_onboarding_expected: uc6State.freshOnboardingExpected,
        fresh_synthetic_expected: uc6State.freshSyntheticExpected,
        synthetic_generation_submitted: uc6State.syntheticGenerationSubmitted,
        synthetic_generation_submission_ambiguous: uc6State.syntheticGenerationSubmissionAmbiguous,
        synthetic_binding_submission_ambiguous: uc6State.syntheticBindingSubmissionAmbiguous,
        fresh_render_submitted: uc6State.freshRenderSubmitted,
        fresh_render_submission_ambiguous: uc6State.freshRenderSubmissionAmbiguous,
        selected_asset_id: uc6State.selectedAssetId,
        asset_source_lane: uc6State.assetSourceLane,
        selected_published_scenario_family_id: uc6State.selectedPublishedScenarioFamilyId,
        selected_published_scenario_key: uc6State.selectedPublishedScenarioKey,
        selected_package_family_id: uc6State.selectedPackageFamilyId,
        selected_package_id: uc6State.selectedPackageId,
        selected_package_version: uc6State.selectedPackageVersion,
        publication_decision_identity: uc6State.publicationDecisionIdentity
      });
      localStorage.setItem(UC6_STORAGE_KEY, JSON.stringify(projected));
    } catch (_) {
      // Local persistence is optional and contains only public job state.
    }
  }

  function loadUC6LocalState() {
    try {
      const raw = localStorage.getItem(UC6_STORAGE_KEY);
      if (!raw) return {};
      return projectUc6PersistedState(JSON.parse(raw));
    } catch (_) {
      return {};
    }
  }

  function clearUC6LocalState() {
    try { localStorage.removeItem(UC6_STORAGE_KEY); } catch (_) {}
  }


  function clearUC6A8FReviewState({ keepDecisionIdentity = false } = {}) {
    uc6State.reviewArtifacts = null;
    uc6State.reviewArtifactsStatus = 'idle';
    uc6State.reviewArtifactsMessage = '';
    uc6State.reviewArtifactDownloadActive = '';
    uc6State.reviewArtifactDownloadMessage = '';
    if (uc6State.reviewArtifactDownloadAbortController) {
      uc6State.reviewArtifactDownloadAbortController.abort();
      uc6State.reviewArtifactDownloadAbortController = null;
    }
    uc6State.publication = null;
    uc6State.publicationStatus = 'idle';
    uc6State.publicationMessage = '';
    uc6State.publicationReviewConfirmed = false;
    uc6State.publicationNoteDraft = '';
    uc6State.reviewSurfaceRequestActive = false;
    uc6State.publicationRequestActive = false;
    if (!keepDecisionIdentity) uc6State.publicationDecisionIdentity = '';
  }

  function ensureUC6PublicationDecisionIdentity() {
    if (uc6State.publicationDecisionIdentity) return uc6State.publicationDecisionIdentity;
    let suffix = '';
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      suffix = globalThis.crypto.randomUUID().replace(/-/g, '');
    } else if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    } else {
      suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
    }
    uc6State.publicationDecisionIdentity = `a8f-${suffix}`.slice(0, 160);
    saveUC6LocalState();
    return uc6State.publicationDecisionIdentity;
  }

  function clearUC6FinalDeliveryState() {
    uc6State.finalDelivery = null;
    uc6State.finalDeliveryStatus = 'idle';
    uc6State.finalDeliveryMessage = '';
    uc6State.finalDeliveryRequestActive = false;
  }

  function resetUC6FreshSyntheticState() {
    uc6State.freshSyntheticExpected = false;
    uc6State.syntheticGenerationSubmission = null;
    uc6State.syntheticGenerationSubmitted = false;
    uc6State.syntheticGenerationSubmissionAmbiguous = false;
    uc6State.syntheticScenarioOptions = [];
    uc6State.syntheticGenerationState = 'not_started';
    uc6State.syntheticSelectionState = 'unbound';
    uc6State.boundSyntheticScenario = null;
    uc6State.selectedSyntheticScenarioKey = '';
    uc6State.syntheticBindingSubmissionAmbiguous = false;
    uc6State.freshRenderSubmitted = false;
    uc6State.freshRenderSubmissionAmbiguous = false;
  }

  function abortUC6Operations() {
    if (uc6State.operationAbortController) uc6State.operationAbortController.abort();
    if (uc6State.pollingAbortController) uc6State.pollingAbortController.abort();
    if (uc6State.finalDeliveryAbortController) uc6State.finalDeliveryAbortController.abort();
    if (uc6State.reviewSurfaceAbortController) uc6State.reviewSurfaceAbortController.abort();
    if (uc6State.publicationAbortController) uc6State.publicationAbortController.abort();
    uc6State.operationAbortController = null;
    uc6State.pollingAbortController = null;
    uc6State.finalDeliveryAbortController = null;
    uc6State.reviewSurfaceAbortController = null;
    uc6State.publicationAbortController = null;
    uc6State.reviewSurfaceRequestActive = false;
    uc6State.publicationRequestActive = false;
    uc6State.statusRequestActive = false;
    uc6State.finalDeliveryRequestActive = false;
  }

  function stopUC6Polling() {
    if (uc6State.pollingTimer) clearTimeout(uc6State.pollingTimer);
    uc6State.pollingTimer = null;
  }

  function resetUC6JobState(clearStorage = false) {
    stopUC6Polling();
    abortUC6Operations();
    uc6State.jobId = '';
    uc6State.jobState = '';
    uc6State.flowLane = 'dummy_render';
    uc6State.reusableAssetCatalog = null;
    uc6State.reusableAssetCatalogStatus = 'idle';
    uc6State.selectedAssetId = '';
    uc6State.assetPackageOptions = null;
    uc6State.assetSourceLane = 'static_package';
    uc6State.linkedScenarioFamily = null;
    uc6State.linkedScenarioFamilyStatus = 'idle';
    uc6State.linkedScenarioFamilyMessage = '';
    uc6State.selectedPublishedScenarioFamilyId = '';
    uc6State.selectedPublishedScenarioKey = '';
    uc6State.assetSubmissionAmbiguous = false;
    uc6State.packageOptions = null;
    uc6State.freshOnboardingExpected = false;
    uc6State.onboardingSubmissionAmbiguous = false;
    resetUC6FreshSyntheticState();
    uc6State.selectedPackageFamilyId = '';
    uc6State.selectedPackageId = '';
    uc6State.selectedPackageVersion = '';
    uc6State.renderStatus = null;
    clearUC6A8FReviewState();
    uc6State.source = null;
    uc6State.review = null;
    uc6State.decision = null;
    uc6State.selectedFile = null;
    uc6State.operationInFlight = false;
    uc6State.analysisSubmittedForJobId = '';
    uc6State.decisionSubmitted = false;
    uc6State.decisionMode = false;
    uc6State.decisionChoiceValue = 'approve';
    uc6State.reviewNotesDraft = '';
    uc6State.requestedRevisionsDraft = '';
    uc6State.stageMessage = '';
    uc6State.reviewMessage = '';
    uc6State.decisionMessage = '';
    clearUC6FinalDeliveryState();
    uc6State.consecutivePollErrors = 0;
    uc6State.lastPollingTimestamp = 0;
    if (uc6Els.fileInput) uc6Els.fileInput.value = '';
    if (clearStorage) clearUC6LocalState();
    renderUC6All();
  }

  function validateUc6PptxSelection(files) {
    if (!files || files.length !== 1) return { ok: false, message: 'PPTX 파일을 하나만 선택하세요.' };
    const file = files[0];
    const name = file?.name || '';
    if (!file || file.size <= 0) return { ok: false, message: '비어 있지 않은 PPTX 파일을 선택하세요.' };
    if (!/\.pptx$/i.test(name)) return { ok: false, message: '확장자가 .pptx인 파일만 업로드할 수 있습니다.' };
    const suppliedType = String(file.type || '').trim();
    if (suppliedType && suppliedType !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return { ok: false, message: '브라우저가 PPTX MIME 형식으로 인식한 파일만 업로드할 수 있습니다.' };
    }
    return { ok: true, file };
  }

  function getUC6SelectedFileValidation() {
    const inputValidation = validateUc6PptxSelection(uc6Els.fileInput?.files);
    if (inputValidation.ok) return inputValidation;
    if (uc6State.selectedFile) return validateUc6PptxSelection([uc6State.selectedFile]);
    return inputValidation;
  }

  function handleUC6AuthorizationFailure(error) {
    const authState = classifyUc6AuthorizationFailure(error);
    if (!authState) return false;
    uc6State.session = null;
    uc6State.decisionMode = false;
    clearUC6FinalDeliveryState();
    stopUC6Polling();
    if (uc6State.pollingAbortController) uc6State.pollingAbortController.abort();
    uc6State.pollingAbortController = null;
    uc6State.statusRequestActive = false;
    saveUC6LocalState();
    if (authState === 'signed_out') {
      setUc6AuthState('signed_out', '관리자 인증이 만료되었습니다. 다시 로그인하세요.');
      return true;
    }
    setUc6AuthState('access_denied', uc6MessageFromError(error));
    return true;
  }

  async function loadUC6FirebaseClient() {
    if (uc6State.firebaseClient) return uc6State.firebaseClient;
    const initResponse = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!initResponse.ok) throw new Error('firebase_init_unavailable');
    const firebaseConfig = await initResponse.json();
    const [appMod, authMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${UC6_FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${UC6_FIREBASE_SDK_VERSION}/firebase-auth.js`)
    ]);
    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserSessionPersistence);
    try { await authMod.getRedirectResult(auth); } catch (_) {}
    uc6State.firebaseClient = { app, auth, authMod };
    uc6State.api = createUc6BrowserAdminApi({
      apiBaseUrl: CONFIG.UC6_BROWSER_ADMIN_API_BASE,
      fetchImpl: fetch,
      getIdToken: async (forceRefresh = false) => {
        if (!uc6State.firebaseUser) throw new Error('firebase_user_missing');
        return uc6State.firebaseUser.getIdToken(forceRefresh === true);
      }
    });
    return uc6State.firebaseClient;
  }

  async function authorizeUC6Session() {
    if (!uc6State.firebaseUser || !uc6State.api) {
      setUc6AuthState('signed_out');
      return;
    }
    setUc6AuthState('authorizing');
    try {
      await uc6State.firebaseUser.getIdToken(true);
      const session = await uc6State.api.getSession();
      if (!validateUc6SessionContract(session)) {
        setUc6AuthState('access_denied');
        return;
      }
      uc6State.session = session;
      setUc6AuthState('authorized', UC6_AUTHORIZED_LABEL);
      await resumeUC6PersistedJob();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      setUc6AuthState('temporarily_unavailable', uc6MessageFromError(error));
    }
  }

  async function initUC6FirebaseAuth() {
    setUc6AuthState('initializing');
    try {
      const { auth, authMod } = await loadUC6FirebaseClient();
      authMod.onAuthStateChanged(auth, async (user) => {
        uc6State.firebaseUser = user || null;
        uc6State.session = null;
        if (!user) {
          resetUC6JobState(false);
          setUc6AuthState('signed_out');
          return;
        }
        await authorizeUC6Session();
      });
    } catch (_) {
      setUc6AuthState('temporarily_unavailable');
    }
  }

  async function signInUC6() {
    try {
      setUc6AuthState('authenticating');
      const { auth, authMod } = await loadUC6FirebaseClient();
      const provider = new authMod.GoogleAuthProvider();
      try {
        await authMod.signInWithPopup(auth, provider);
      } catch (error) {
        const code = String(error?.code || '');
        if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/operation-not-supported-in-this-environment') {
          await authMod.signInWithRedirect(auth, provider);
          return;
        }
        throw error;
      }
    } catch (_) {
      setUc6AuthState('signed_out', '로그인을 완료하지 못했습니다. 다시 시도하세요.');
    }
  }

  async function signOutUC6() {
    try {
      const client = uc6State.firebaseClient || await loadUC6FirebaseClient();
      abortUC6Operations();
      stopUC6Polling();
      await client.authMod.signOut(client.auth);
    } catch (_) {
      resetUC6JobState(false);
      setUc6AuthState('signed_out');
    }
  }

  async function refreshUC6Session() {
    if (!uc6State.firebaseUser) {
      setUc6AuthState('signed_out');
      return;
    }
    await authorizeUC6Session();
  }

  async function resumeUC6PersistedJob() {
    const persisted = loadUC6LocalState();
    try {
      const persistedJobId = persisted.job_id ? normalizeUc6JobId(persisted.job_id) : '';
      if (uc6State.jobId && uc6State.jobId !== persistedJobId) resetUC6FreshSyntheticState();
      uc6State.freshOnboardingExpected = persisted.fresh_onboarding_expected === true;
      uc6State.freshSyntheticExpected = persisted.fresh_synthetic_expected === true;
      uc6State.syntheticGenerationSubmitted = persisted.synthetic_generation_submitted === true;
      uc6State.syntheticGenerationSubmissionAmbiguous = persisted.synthetic_generation_submission_ambiguous === true;
      uc6State.syntheticBindingSubmissionAmbiguous = persisted.synthetic_binding_submission_ambiguous === true;
      uc6State.freshRenderSubmitted = persisted.fresh_render_submitted === true;
      uc6State.freshRenderSubmissionAmbiguous = persisted.fresh_render_submission_ambiguous === true;
      uc6State.flowLane = uc6State.freshOnboardingExpected
        ? 'dummy_render'
        : persisted.flow_lane || (persisted.job_id ? 'legacy_analysis' : 'dummy_render');
      if (persisted.selected_asset_id) uc6State.selectedAssetId = persisted.selected_asset_id;
      uc6State.assetSourceLane = persisted.asset_source_lane || 'static_package';
      if (persisted.selected_published_scenario_family_id) {
        uc6State.selectedPublishedScenarioFamilyId = persisted.selected_published_scenario_family_id;
      }
      if (persisted.selected_published_scenario_key) {
        uc6State.selectedPublishedScenarioKey = persisted.selected_published_scenario_key;
      }
      if (persisted.selected_package_family_id && uc6State.flowLane === 'dummy_render') {
        uc6State.selectedPackageFamilyId = persisted.selected_package_family_id;
      }
      if (persisted.selected_package_id) uc6State.selectedPackageId = persisted.selected_package_id;
      if (persisted.selected_package_version) uc6State.selectedPackageVersion = persisted.selected_package_version;
      if (persisted.publication_decision_identity) uc6State.publicationDecisionIdentity = persisted.publication_decision_identity;

      if (!persisted.job_id) {
        if (uc6State.flowLane === 'asset_render') await loadUC6ReusableAssetCatalog();
        return;
      }
      uc6State.jobId = persistedJobId;
      await refreshUC6JobStatus({ fetchReview: uc6State.flowLane === 'legacy_analysis' });

      if (isUC6JobPollingPending()) startUC6Polling();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      clearUC6LocalState();
      resetUC6JobState(false);
    }
  }

  function createUC6OperationController() {
    if (uc6State.operationAbortController) uc6State.operationAbortController.abort();
    uc6State.operationAbortController = new AbortController();
    return uc6State.operationAbortController;
  }

  async function uploadUC6PptxJob() {
    if (!isUc6Authorized() || uc6State.operationInFlight) return;
    const validation = getUC6SelectedFileValidation();
    if (!validation.ok) {
      uc6State.stageMessage = validation.message;
      setUC6LiveMessage(validation.message);
      renderUC6All();
      return;
    }
    resetUC6JobState(true);
    uc6State.selectedFile = validation.file;
    uc6State.operationInFlight = true;
    uc6State.flowLane = 'dummy_render';
    uc6State.stageMessage = 'PPTX를 등록하고 Fresh same-job R1 onboarding을 준비하고 있습니다.';
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const created = await uc6State.api.createJob(validation.file, { signal: controller.signal });
      uc6State.jobId = normalizeUc6JobId(created?.job_id);
      uc6State.jobState = created.state || 'source_ready';
      uc6State.freshOnboardingExpected = true;
      uc6State.freshSyntheticExpected = true;
      uc6State.source = {
        sha256: created.source?.sha256,
        size_bytes: created.source?.size_bytes,
        slide_count: created.source?.slide_count,
        filename: boundedFilename(created.source?.filename || validation.file.name)
      };
      saveUC6LocalState();
      renderUC6All();
      const submitted = await uc6State.api.submitFreshTemplateOnboarding(uc6State.jobId, { signal: controller.signal });
      const projected = projectUc6FreshTemplateOnboardingSubmission(submitted, { expectedJobId: uc6State.jobId });
      uc6State.jobState = projected.state;
      uc6State.consecutivePollErrors = 0;
      if (projected.state === 'onboarding_ready') {
        uc6State.stageMessage = 'Fresh onboarding이 완료되었습니다. 합성 샘플 컨텍스트 상태를 확인하고 있습니다.';
        saveUC6LocalState();
        const synthetic = await reconcileUC6FreshSyntheticScenarios({ signal: controller.signal, allowSubmit: true });
        if (
          synthetic?.generation_state === 'generation_queued'
          || synthetic?.generation_state === 'generation_running'
          || (
            synthetic?.generation_state === 'not_started'
            && uc6State.syntheticGenerationSubmitted
            && !uc6State.syntheticGenerationSubmissionAmbiguous
          )
        ) startUC6Polling();
      } else if (projected.state === 'onboarding_blocked') {
        uc6State.stageMessage = 'Fresh onboarding을 완료할 수 없습니다. 새 PPTX를 선택하거나 작업 상태를 다시 확인하세요.';
        saveUC6LocalState();
      } else {
        uc6State.stageMessage = 'Fresh onboarding 요청이 접수되었습니다. 작업 상태를 확인하고 있습니다.';
        saveUC6LocalState();
        startUC6Polling();
      }
    } catch (error) {
      if (error?.name === 'Uc6AmbiguousSubmissionError' || error?.code === 'ambiguous_submission') {
        uc6State.onboardingSubmissionAmbiguous = true;
        uc6State.stageMessage = 'Fresh onboarding 요청의 접수 여부를 확인할 수 없습니다. POST를 다시 보내지 않고 작업 상태만 확인합니다.';
        setUC6LiveMessage(uc6State.stageMessage);
        saveUC6LocalState();
        renderUC6All();
        startUC6Polling();
        return;
      }
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    } finally {
      uc6State.operationInFlight = false;
      renderUC6All();
    }
  }

  function switchUC6FlowLane(lane) {
    if (!isUc6Authorized() || uc6State.operationInFlight || uc6State.jobId) return;
    if (lane !== 'dummy_render' && lane !== 'asset_render') return;
    uc6State.flowLane = lane;
    uc6State.stageMessage = '';
    uc6State.assetSubmissionAmbiguous = false;
    resetUC6FreshSyntheticState();
    if (lane === 'asset_render') {
      uc6State.selectedPackageFamilyId = '';
      uc6State.selectedFile = null;
      loadUC6ReusableAssetCatalog().catch(() => {});
    }
    saveUC6LocalState();
    renderUC6All();
  }

  async function loadUC6ReusableAssetCatalog(signal) {
    if (!isUc6Authorized() || uc6State.flowLane !== 'asset_render') return;
    uc6State.reusableAssetCatalogStatus = 'loading';
    uc6State.stageMessage = '게시된 reusable Asset 목록을 확인하고 있습니다.';
    renderUC6All();
    try {
      const raw = await uc6State.api.getReusableAssets({ signal });
      const catalog = projectUc6ReusableAssetCatalog(raw);
      uc6State.reusableAssetCatalog = catalog;
      uc6State.reusableAssetCatalogStatus = 'ready';
      const selected = catalog.assets.find((asset) => asset.asset_id === uc6State.selectedAssetId);
      if (!selected) {
        uc6State.selectedAssetId = '';
        uc6State.selectedPackageId = '';
        uc6State.selectedPackageVersion = '';
        uc6State.assetPackageOptions = null;
        uc6State.linkedScenarioFamily = null;
        uc6State.linkedScenarioFamilyStatus = 'idle';
        uc6State.selectedPublishedScenarioFamilyId = '';
        uc6State.selectedPublishedScenarioKey = '';
      }
      uc6State.stageMessage = catalog.asset_count
        ? '게시된 reusable Asset을 선택하세요.'
        : '현재 사용할 수 있는 게시 Asset이 없습니다.';
      saveUC6LocalState();
      renderUC6All();
      if (selected) await Promise.allSettled([
        loadUC6ReusableAssetPackages(signal),
        loadUC6PublishedAssetLinkedScenarioFamily(signal)
      ]);
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      uc6State.reusableAssetCatalogStatus = 'error';
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    }
  }

  async function selectUC6ReusableAsset(assetId) {
    if (!isUc6Authorized() || uc6State.operationInFlight || uc6State.jobId) return;
    const asset = uc6State.reusableAssetCatalog?.assets?.find((row) => row.asset_id === assetId);
    if (!asset) return;
    uc6State.selectedAssetId = asset.asset_id;
    uc6State.selectedPackageId = '';
    uc6State.selectedPackageVersion = '';
    uc6State.assetPackageOptions = null;
    uc6State.assetSourceLane = 'static_package';
    uc6State.linkedScenarioFamily = null;
    uc6State.linkedScenarioFamilyStatus = 'loading';
    uc6State.linkedScenarioFamilyMessage = '연결된 게시 Scenario Family를 확인하고 있습니다.';
    uc6State.selectedPublishedScenarioFamilyId = '';
    uc6State.selectedPublishedScenarioKey = '';
    uc6State.stageMessage = '선택한 Asset에 사용할 수 있는 Source Context를 확인하고 있습니다.';
    saveUC6LocalState();
    renderUC6All();
    await Promise.allSettled([
      loadUC6ReusableAssetPackages(),
      loadUC6PublishedAssetLinkedScenarioFamily()
    ]);
  }

  async function loadUC6PublishedAssetLinkedScenarioFamily(signal) {
    if (!isUc6Authorized() || uc6State.flowLane !== 'asset_render' || !uc6State.selectedAssetId) return;
    uc6State.linkedScenarioFamilyStatus = 'loading';
    uc6State.linkedScenarioFamilyMessage = '연결된 게시 Scenario Family를 확인하고 있습니다.';
    renderUC6All();
    try {
      const raw = await uc6State.api.getPublishedAssetLinkedScenarioFamily(uc6State.selectedAssetId, { signal });
      const projected = projectUc6PublishedAssetLinkedScenarioFamily(raw, { expectedAssetId: uc6State.selectedAssetId });
      uc6State.linkedScenarioFamily = projected;
      uc6State.linkedScenarioFamilyStatus = 'ready';
      uc6State.linkedScenarioFamilyMessage = '세 가지 reusable source-data 시나리오 중 하나를 선택할 수 있습니다.';
      uc6State.selectedPublishedScenarioFamilyId = projected.linked_scenario_family.published_scenario_family_id;
      if (!projected.linked_scenario_family.scenarios.some((scenario) => scenario.scenario_key === uc6State.selectedPublishedScenarioKey)) {
        uc6State.selectedPublishedScenarioKey = '';
      }
      saveUC6LocalState();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      uc6State.linkedScenarioFamily = null;
      uc6State.linkedScenarioFamilyStatus = 'unavailable';
      uc6State.linkedScenarioFamilyMessage = error?.code === 'browser_admin_uc6_linked_scenario_family_not_found'
        ? '이 Asset에는 연결된 게시 Scenario Family가 없습니다. 기존 curated/static 패키지는 계속 사용할 수 있습니다.'
        : '연결된 Scenario Family를 사용할 수 없습니다. 기존 curated/static 패키지는 계속 사용할 수 있습니다.';
      uc6State.selectedPublishedScenarioFamilyId = '';
      uc6State.selectedPublishedScenarioKey = '';
    } finally {
      renderUC6All();
    }
  }

  async function loadUC6ReusableAssetPackages(signal) {
    if (!isUc6Authorized() || uc6State.flowLane !== 'asset_render' || !uc6State.selectedAssetId) return;
    try {
      const raw = await uc6State.api.getReusableAssetPackages(uc6State.selectedAssetId, { signal });
      const options = projectUc6ReusableAssetPackageOptions(raw, { expectedAssetId: uc6State.selectedAssetId });
      uc6State.assetPackageOptions = options;
      const matched = options.packages.find((pkg) => pkg.package_id === uc6State.selectedPackageId && pkg.package_version === uc6State.selectedPackageVersion);
      if (!matched) {
        uc6State.selectedPackageId = '';
        uc6State.selectedPackageVersion = '';
      }
      uc6State.stageMessage = options.package_count
        ? '새 문서에 적용할 데이터 시나리오를 선택하세요.'
        : '선택한 Asset과 호환되는 데이터 패키지가 없습니다.';
      saveUC6LocalState();
      renderUC6All();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      uc6State.assetPackageOptions = null;
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    }
  }

  async function submitUC6ReusableAssetRender() {
    if (!isUc6Authorized() || uc6State.operationInFlight || uc6State.jobId || !uc6State.selectedAssetId) return;
    if (!uc6State.selectedPackageId || !uc6State.selectedPackageVersion) {
      uc6State.stageMessage = '데이터 패키지를 선택하세요.';
      renderUC6All();
      return;
    }
    uc6State.operationInFlight = true;
    uc6State.assetSubmissionAmbiguous = false;
    uc6State.stageMessage = '게시된 Asset과 선택한 데이터로 새 문서 생성을 요청하고 있습니다.';
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const raw = await uc6State.api.submitReusableAssetRender(
        uc6State.selectedAssetId,
        { package_id: uc6State.selectedPackageId, package_version: uc6State.selectedPackageVersion },
        { packageOptions: uc6State.assetPackageOptions, signal: controller.signal }
      );
      const submitted = projectUc6ReusableAssetRenderSubmission(raw, { expectedAssetId: uc6State.selectedAssetId });
      uc6State.jobId = submitted.job_id;
      uc6State.jobState = submitted.state;
      uc6State.source = {
        sha256: submitted.asset.source_pptx_sha256,
        slide_count: submitted.asset.slide_count
      };
      uc6State.renderStatus = null;
      uc6State.selectedPackageId = submitted.bound_package.package_id;
      uc6State.selectedPackageVersion = submitted.bound_package.package_version;
      uc6State.stageMessage = '생성 요청이 접수되었습니다. 서버 상태를 확인하고 있습니다.';
      uc6State.consecutivePollErrors = 0;
      saveUC6LocalState();
      renderUC6All();
      if (submitted.state === 'render_queued' || submitted.state === 'render_running') startUC6Polling();
      else await refreshUC6JobStatus();
    } catch (error) {
      if (error?.name === 'Uc6AmbiguousSubmissionError' || error?.code === 'ambiguous_submission') {
        uc6State.assetSubmissionAmbiguous = true;
        uc6State.jobState = 'render_unknown';
        uc6State.stageMessage = '생성 요청의 접수 여부를 확인할 수 없습니다. 자동 재전송하지 않습니다.';
        setUC6LiveMessage(uc6State.stageMessage);
        saveUC6LocalState();
        renderUC6All();
        return;
      }
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    } finally {
      uc6State.operationInFlight = false;
      renderUC6All();
    }
  }

  async function loadUC6A8HDeliveryState(signal) {
    if (!isUc6Authorized() || uc6State.flowLane !== 'asset_render' || !uc6State.jobId || uc6State.jobState !== 'render_completed' || !uc6State.renderStatus) return;
    uc6State.reviewArtifactsStatus = 'loading';
    uc6State.reviewArtifactsMessage = '다운로드 capability를 준비하고 있습니다.';
    renderUC6All();
    try {
      const payload = await uc6State.api.getRenderArtifactCapabilities(uc6State.jobId, { signal });
      const capabilities = projectUc6FinalDeliveryCapabilities(payload, {
        expectedJobId: uc6State.jobId,
        apiBaseUrl: CONFIG.UC6_BROWSER_ADMIN_API_BASE
      });
      const pdf = capabilities.artifacts.find((artifact) => artifact.alias === 'final_render_output_pdf');
      const pptx = capabilities.artifacts.find((artifact) => artifact.alias === 'final_render_output_pptx');
      if (!pdf?.ready || !pptx?.ready) {
        throw new TypeError('render_only_artifact_capability_mismatch');
      }
      uc6State.reviewArtifacts = capabilities;
      uc6State.reviewArtifactsStatus = 'ready';
      uc6State.reviewArtifactsMessage = 'PPTX와 PDF 다운로드가 준비되었습니다.';
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      uc6State.reviewArtifacts = null;
      uc6State.reviewArtifactsStatus = 'error';
      uc6State.reviewArtifactsMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.reviewArtifactsMessage);
    } finally {
      renderUC6All();
    }
  }

  function restartUC6AssetRenderSelection() {
    stopUC6Polling();
    abortUC6Operations();
    uc6State.jobId = '';
    uc6State.jobState = '';
    uc6State.renderStatus = null;
    uc6State.source = null;
    uc6State.assetSubmissionAmbiguous = false;
    clearUC6A8FReviewState({ keepDecisionIdentity: false });
    uc6State.stageMessage = uc6State.selectedAssetId ? '데이터 패키지를 확인한 뒤 새 render-only job을 생성하세요.' : '게시된 reusable Asset을 선택하세요.';
    saveUC6LocalState();
    renderUC6All();
    if (uc6State.selectedAssetId) loadUC6ReusableAssetCatalog().catch(() => {});
  }

  function findUC6PackageFamiliesForPackage(packageId, packageVersion, options = uc6State.packageOptions) {
    if (!options || !Array.isArray(options.package_families)) return [];
    return options.package_families.filter((family) => (
      Array.isArray(family.variants)
      && family.variants.some((variant) => variant.package_id === packageId && variant.package_version === packageVersion)
    ));
  }

  async function loadUC6FreshRenderDeliveryState(signal, options = {}) {
    const deliveryControl = projectUc6FreshRenderDeliveryControl({
      publicState: uc6State.jobState,
      deliveryStatus: uc6State.reviewArtifactsStatus,
      explicitRetry: options.explicitRetry === true
    });
    if (
      !isUc6Authorized()
      || uc6State.flowLane !== 'dummy_render'
      || !uc6State.freshSyntheticExpected
      || !uc6State.jobId
      || !uc6State.renderStatus
      || !deliveryControl.shouldResolveCapabilities
    ) return;
    uc6State.reviewArtifactsStatus = 'loading';
    uc6State.reviewArtifactsMessage = '최종 PPTX/PDF 접근 권한을 준비하고 있습니다.';
    renderUC6All();
    try {
      const payload = await uc6State.api.getRenderArtifactCapabilities(uc6State.jobId, { signal });
      const capabilities = projectUc6FinalDeliveryCapabilities(payload, {
        expectedJobId: uc6State.jobId,
        apiBaseUrl: CONFIG.UC6_BROWSER_ADMIN_API_BASE
      });
      const pdf = capabilities.artifacts.find((artifact) => artifact.alias === 'final_render_output_pdf');
      const pptx = capabilities.artifacts.find((artifact) => artifact.alias === 'final_render_output_pptx');
      if (!pdf?.ready || !pptx?.ready) throw new TypeError('fresh_render_artifact_capability_mismatch');
      uc6State.reviewArtifacts = capabilities;
      uc6State.reviewArtifactsStatus = 'ready';
      uc6State.reviewArtifactsMessage = '생성된 PPTX와 최종 PDF가 준비되었습니다.';
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      uc6State.reviewArtifacts = null;
      uc6State.reviewArtifactsStatus = 'error';
      uc6State.reviewArtifactsMessage = '문서 생성은 완료되었지만 결과 파일 접근 정보를 확인하지 못했습니다. 새로고침 후 다시 확인할 수 있습니다.';
      setUC6LiveMessage(uc6State.reviewArtifactsMessage);
    } finally {
      renderUC6All();
    }
  }

  function getSelectedUC6PackageFamily(options = uc6State.packageOptions) {
    if (!options || !Array.isArray(options.package_families)) return null;
    return options.package_families.find((family) => family.package_family_id === uc6State.selectedPackageFamilyId) || null;
  }

  function getSelectedUC6PackageVariant(options = uc6State.packageOptions) {
    const family = getSelectedUC6PackageFamily(options);
    if (!family || !Array.isArray(family.variants)) return null;
    return family.variants.find((variant) => (
      variant.package_id === uc6State.selectedPackageId
      && variant.package_version === uc6State.selectedPackageVersion
    )) || null;
  }

  function reconcileUC6BoundPackageFamily(boundPackage, options = uc6State.packageOptions) {
    if (!boundPackage || !options) return null;
    const families = findUC6PackageFamiliesForPackage(boundPackage.package_id, boundPackage.package_version, options);
    if (families.length !== 1) {
      uc6State.selectedPackageFamilyId = '';
      options.selection_state = 'bound';
      options.bound_package_family_id = null;
      options.bound_package = boundPackage;
      uc6State.stageMessage = '서버가 데이터 시나리오를 고정했지만 데이터 그룹을 확인할 수 없습니다. 상태를 다시 확인하세요.';
      return null;
    }
    const family = families[0];
    uc6State.selectedPackageFamilyId = family.package_family_id;
    options.selection_state = 'bound';
    options.bound_package_family_id = family.package_family_id;
    options.bound_package = boundPackage;
    return family;
  }

  function mapUC6SyntheticGenerationStateToJobState(generationState, selectionState = 'unbound') {
    if (selectionState === 'bound') return 'synthetic_scenario_bound';
    return {
      not_started: 'onboarding_ready',
      generation_queued: 'synthetic_scenarios_queued',
      generation_running: 'synthetic_scenarios_running',
      generation_ready: 'synthetic_scenarios_ready',
      generation_failed: 'synthetic_scenarios_failed'
    }[generationState] || 'onboarding_ready';
  }

  function applyUC6FreshSyntheticProjection(projected) {
    uc6State.freshSyntheticExpected = true;
    uc6State.packageOptions = null;
    uc6State.syntheticGenerationState = projected.generation_state;
    uc6State.syntheticScenarioOptions = projected.scenario_options;
    uc6State.syntheticSelectionState = projected.selection_state;
    uc6State.boundSyntheticScenario = projected.bound_scenario;
    uc6State.selectedSyntheticScenarioKey = projected.bound_scenario?.scenario_key || '';
    uc6State.jobState = mapUC6SyntheticGenerationStateToJobState(projected.generation_state, projected.selection_state);
    if (projected.generation_state !== 'not_started') {
      uc6State.syntheticGenerationSubmitted = true;
      uc6State.syntheticGenerationSubmissionAmbiguous = false;
    }
    if (projected.selection_state === 'bound') uc6State.syntheticBindingSubmissionAmbiguous = false;

    if (projected.selection_state === 'bound') {
      uc6State.stageMessage = uc6State.freshRenderSubmissionAmbiguous
        ? '샘플 문서 생성 요청의 접수 여부를 확인하고 있습니다. POST를 다시 보내지 않습니다.'
        : uc6State.freshRenderSubmitted
          ? '샘플 문서 생성 요청이 전송되었습니다. 서버 상태를 확인하고 있습니다.'
          : '샘플 컨텍스트 선택이 완료되었습니다. 명시적으로 샘플 문서 생성을 시작할 수 있습니다.';
    } else if (projected.generation_state === 'not_started') {
      uc6State.stageMessage = uc6State.syntheticGenerationSubmissionAmbiguous
        ? '생성 요청 결과가 아직 확인되지 않았습니다. POST를 다시 보내지 않고 서버 상태만 확인합니다.'
        : '합성 샘플 컨텍스트 생성 요청을 준비하고 있습니다.';
    } else if (projected.generation_state === 'generation_queued') {
      uc6State.stageMessage = '샘플 컨텍스트 생성 대기 중';
    } else if (projected.generation_state === 'generation_running') {
      uc6State.stageMessage = '샘플 컨텍스트 생성 중';
    } else if (projected.generation_state === 'generation_ready') {
      uc6State.stageMessage = uc6State.syntheticBindingSubmissionAmbiguous
        ? '선택 요청 결과를 확인하지 못했습니다. 다른 시나리오를 선택하지 말고 작업 상태를 새로고침하세요.'
        : '생성된 세 가지 합성 샘플 컨텍스트 중 하나를 선택하세요.';
    } else {
      uc6State.stageMessage = '합성 샘플 컨텍스트 생성에 실패했습니다. 서버 상태를 다시 확인하거나 새 문서를 시작하세요.';
    }
    saveUC6LocalState();
    renderUC6All();
  }

  async function loadUC6FreshSyntheticScenarios(signal) {
    const raw = await uc6State.api.getFreshSyntheticScenarios(uc6State.jobId, { signal });
    const projected = projectUc6FreshSyntheticScenarios(raw, {
      expectedJobId: uc6State.jobId,
      expectedSourceSha: uc6State.source?.sha256
    });
    applyUC6FreshSyntheticProjection(projected);
    return projected;
  }

  async function submitUC6FreshSyntheticGeneration(signal) {
    if (uc6State.syntheticGenerationSubmitted || uc6State.syntheticGenerationSubmissionAmbiguous) return null;
    uc6State.syntheticGenerationSubmitted = true;
    uc6State.stageMessage = '합성 샘플 컨텍스트 생성 요청을 전송하고 있습니다.';
    saveUC6LocalState();
    renderUC6All();
    try {
      const raw = await uc6State.api.submitFreshSyntheticScenarios(uc6State.jobId, { signal });
      const projected = projectUc6FreshSyntheticGenerationSubmission(raw, { expectedJobId: uc6State.jobId });
      uc6State.syntheticGenerationSubmission = projected;
      uc6State.syntheticGenerationSubmissionAmbiguous = false;
      uc6State.jobState = projected.state;
      saveUC6LocalState();
      return await loadUC6FreshSyntheticScenarios(signal);
    } catch (error) {
      if (error?.name !== 'Uc6AmbiguousSubmissionError' && error?.code !== 'ambiguous_submission') throw error;
      uc6State.syntheticGenerationSubmissionAmbiguous = true;
      uc6State.stageMessage = '생성 요청의 접수 여부를 확인할 수 없습니다. POST를 다시 보내지 않고 서버 상태만 확인합니다.';
      saveUC6LocalState();
      renderUC6All();
      return loadUC6FreshSyntheticScenarios(signal);
    }
  }

  async function reconcileUC6FreshSyntheticScenarios({ signal, allowSubmit = false } = {}) {
    const projected = await loadUC6FreshSyntheticScenarios(signal);
    if (
      projected.generation_state === 'not_started'
      && allowSubmit
      && !uc6State.syntheticGenerationSubmitted
      && !uc6State.syntheticGenerationSubmissionAmbiguous
    ) {
      return submitUC6FreshSyntheticGeneration(signal);
    }
    return projected;
  }

  async function bindUC6FreshSyntheticScenario(scenarioKey) {
    if (
      !isUc6Authorized()
      || uc6State.operationInFlight
      || uc6State.syntheticSelectionState === 'bound'
      || uc6State.syntheticBindingSubmissionAmbiguous
      || uc6State.syntheticGenerationState !== 'generation_ready'
    ) return;
    const validation = validateUc6SyntheticScenarioBindingCommand(scenarioKey);
    const option = validation.ok
      ? uc6State.syntheticScenarioOptions.find((row) => row.scenario_key === validation.body.scenario_key)
      : null;
    if (!validation.ok || !option) {
      uc6State.stageMessage = validation.message || '합성 샘플 컨텍스트 선택값을 확인하세요.';
      renderUC6All();
      return;
    }
    uc6State.operationInFlight = true;
    uc6State.assetSourceLane = 'static_package';
    uc6State.selectedSyntheticScenarioKey = option.scenario_key;
    uc6State.stageMessage = '선택한 합성 샘플 컨텍스트를 이 작업에 고정하고 있습니다.';
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const raw = await uc6State.api.bindFreshSyntheticScenario(uc6State.jobId, option.scenario_key, { signal: controller.signal });
      const projected = projectUc6FreshSyntheticScenarioBinding(raw, {
        expectedJobId: uc6State.jobId,
        expectedScenarioKey: option.scenario_key,
        expectedSourceSha: uc6State.source?.sha256
      });
      uc6State.syntheticSelectionState = 'bound';
      uc6State.boundSyntheticScenario = projected.bound_scenario;
      uc6State.selectedSyntheticScenarioKey = projected.bound_scenario.scenario_key;
      uc6State.syntheticBindingSubmissionAmbiguous = false;
      uc6State.freshRenderSubmitted = false;
      uc6State.freshRenderSubmissionAmbiguous = false;
      uc6State.jobState = 'synthetic_scenario_bound';
      uc6State.stageMessage = '샘플 컨텍스트 선택 완료. 준비가 되면 샘플 문서 생성을 시작하세요.';
      stopUC6Polling();
      saveUC6LocalState();
      setUC6LiveMessage(uc6State.stageMessage);
    } catch (error) {
      if (error?.name === 'Uc6AmbiguousSubmissionError' || error?.code === 'ambiguous_submission') {
        uc6State.syntheticBindingSubmissionAmbiguous = true;
        uc6State.stageMessage = '선택 요청 결과가 불명확하여 GET으로 서버 상태를 확인합니다. 다른 선택은 전송하지 않습니다.';
        saveUC6LocalState();
        try {
          await loadUC6FreshSyntheticScenarios(controller.signal);
        } catch (readError) {
          if (handleUC6AuthorizationFailure(readError)) return;
          if (readError?.name !== 'AbortError') uc6State.stageMessage = '선택 결과를 확인하지 못했습니다. 작업 상태를 새로고침하세요.';
        }
      } else if (Number(error?.status) === 409) {
        try {
          await loadUC6FreshSyntheticScenarios(controller.signal);
        } catch (readError) {
          if (handleUC6AuthorizationFailure(readError)) return;
          if (readError?.name !== 'AbortError') uc6State.stageMessage = '서버에 고정된 선택을 확인하지 못했습니다. 작업 상태를 새로고침하세요.';
        }
      } else if (!handleUC6AuthorizationFailure(error) && error?.name !== 'AbortError') {
        uc6State.stageMessage = uc6MessageFromError(error);
        setUC6LiveMessage(uc6State.stageMessage);
      }
    } finally {
      uc6State.operationInFlight = false;
      saveUC6LocalState();
      renderUC6All();
    }
  }

  async function submitUC6PublishedAssetScenarioRender() {
    if (!isUc6Authorized() || uc6State.operationInFlight || uc6State.jobId || !uc6State.selectedAssetId) return;
    const family = uc6State.linkedScenarioFamily;
    if (
      uc6State.linkedScenarioFamilyStatus !== 'ready'
      || !family
      || !uc6State.selectedPublishedScenarioFamilyId
      || !uc6State.selectedPublishedScenarioKey
    ) {
      uc6State.linkedScenarioFamilyMessage = '연결된 Scenario Family와 시나리오 하나를 선택하세요.';
      renderUC6All();
      return;
    }
    uc6State.operationInFlight = true;
    uc6State.assetSourceLane = 'published_scenario_family';
    uc6State.assetSubmissionAmbiguous = false;
    uc6State.stageMessage = '게시 Scenario Family의 선택한 source-data 상황으로 새 문서 생성을 요청하고 있습니다.';
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const raw = await uc6State.api.submitPublishedAssetScenarioRender(
        uc6State.selectedAssetId,
        {
          published_scenario_family_id: uc6State.selectedPublishedScenarioFamilyId,
          scenario_key: uc6State.selectedPublishedScenarioKey
        },
        { linkedFamilyProjection: family, signal: controller.signal }
      );
      const submitted = projectUc6PublishedAssetScenarioRenderSubmission(raw, { expectedAssetId: uc6State.selectedAssetId });
      uc6State.jobId = submitted.job_id;
      uc6State.jobState = submitted.state;
      uc6State.source = {
        sha256: submitted.asset.source_pptx_sha256,
        slide_count: submitted.asset.slide_count
      };
      uc6State.renderStatus = null;
      uc6State.selectedPublishedScenarioFamilyId = submitted.linked_scenario_family.published_scenario_family_id;
      uc6State.selectedPublishedScenarioKey = submitted.linked_scenario_family.scenario_key;
      uc6State.selectedPackageId = submitted.bound_package.package_id;
      uc6State.selectedPackageVersion = submitted.bound_package.package_version;
      uc6State.stageMessage = '동적 생성 요청이 접수되었습니다. Provider 생성과 물리 렌더 상태를 확인하고 있습니다.';
      uc6State.consecutivePollErrors = 0;
      saveUC6LocalState();
      renderUC6All();
      if (submitted.state === 'render_queued' || submitted.state === 'render_running') startUC6Polling();
      else await refreshUC6JobStatus();
    } catch (error) {
      if (error?.name === 'Uc6AmbiguousSubmissionError' || error?.code === 'ambiguous_submission') {
        uc6State.assetSubmissionAmbiguous = true;
        uc6State.jobState = 'render_unknown';
        uc6State.stageMessage = '동적 생성 요청의 접수 여부를 확인할 수 없습니다. Provider 생성을 자동 재전송하지 않습니다.';
        setUC6LiveMessage(uc6State.stageMessage);
        saveUC6LocalState();
        renderUC6All();
        return;
      }
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    } finally {
      uc6State.operationInFlight = false;
      renderUC6All();
    }
  }

  async function submitUC6FreshSyntheticRender() {
    const control = projectUc6FreshSyntheticRenderControl({
      selectionState: uc6State.syntheticSelectionState,
      boundScenario: uc6State.boundSyntheticScenario,
      publicState: uc6State.jobState,
      submitted: uc6State.freshRenderSubmitted,
      ambiguous: uc6State.freshRenderSubmissionAmbiguous,
      inFlight: uc6State.operationInFlight
    });
    if (!isUc6Authorized() || !uc6State.jobId || !control.canSubmit) return;

    uc6State.operationInFlight = true;
    uc6State.freshRenderSubmitted = true;
    uc6State.freshRenderSubmissionAmbiguous = false;
    uc6State.stageMessage = '선택한 샘플 컨텍스트로 문서 생성 요청을 전송하고 있습니다.';
    saveUC6LocalState();
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const raw = await uc6State.api.submitFreshSyntheticScenarioRender(uc6State.jobId, { signal: controller.signal });
      let projected;
      try {
        projected = projectUc6FreshSyntheticRenderSubmission(raw, {
          expectedJobId: uc6State.jobId,
          expectedScenarioKey: uc6State.boundSyntheticScenario.scenario_key
        });
      } catch (projectionError) {
        projectionError.code = 'ambiguous_submission_projection';
        throw projectionError;
      }
      uc6State.freshRenderSubmissionAmbiguous = false;
      uc6State.jobState = projected.state;
      if (projected.bound_scenario) {
        uc6State.boundSyntheticScenario = projected.bound_scenario;
        uc6State.syntheticSelectionState = 'bound';
      }
      uc6State.consecutivePollErrors = 0;
      uc6State.stageMessage = projected.state === 'render_completed'
        ? '샘플 문서 생성이 완료되었습니다. 산출물을 확인하고 있습니다.'
        : projected.state === 'failed'
          ? '샘플 문서 생성 작업의 안전한 실패 상태를 확인하고 있습니다.'
          : '샘플 문서 생성 요청이 접수되었습니다. 서버 상태를 확인하고 있습니다.';
      saveUC6LocalState();
      renderUC6All();
      if (projected.state === 'render_queued' || projected.state === 'render_running') startUC6Polling();
      else await refreshUC6JobStatus({ signal: controller.signal });
    } catch (error) {
      if (
        error?.name === 'Uc6AmbiguousSubmissionError'
        || error?.code === 'ambiguous_submission'
        || error?.code === 'ambiguous_submission_projection'
        || Number(error?.status) === 409
      ) {
        uc6State.freshRenderSubmissionAmbiguous = true;
        uc6State.jobState = 'render_unknown';
        uc6State.stageMessage = '생성 요청 결과가 불명확합니다. POST를 다시 보내지 않고 서버 상태를 확인합니다.';
        saveUC6LocalState();
        renderUC6All();
        try {
          await refreshUC6JobStatus({ signal: controller.signal, renderSubmissionReconciliation: true });
          if (uc6State.jobState === 'render_queued' || uc6State.jobState === 'render_running') startUC6Polling();
        } catch (readError) {
          if (handleUC6AuthorizationFailure(readError)) return;
          if (readError?.name !== 'AbortError') {
            uc6State.stageMessage = '생성 요청 결과를 확인하지 못했습니다. 작업 상태를 다시 확인하세요.';
          }
        }
        return;
      }
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name !== 'AbortError') {
        uc6State.freshRenderSubmitted = false;
        uc6State.stageMessage = uc6MessageFromError(error);
        setUC6LiveMessage(uc6State.stageMessage);
      }
    } finally {
      uc6State.operationInFlight = false;
      saveUC6LocalState();
      renderUC6All();
    }
  }

  async function loadUC6PackageOptions(signal) {
    if (!isUc6Authorized() || uc6State.flowLane !== 'dummy_render' || !uc6State.jobId) return;
    try {
      const raw = await uc6State.api.getDummyDatabagPackageFamilies(uc6State.jobId, { signal });
      const projected = projectUc6DummyDatabagPackageFamilyOptions(raw, { expectedJobId: uc6State.jobId });
      uc6State.packageOptions = projected;
      const isFresh = projected.schema_version === UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA;
      if (isFresh) {
        uc6State.freshOnboardingExpected = true;
        uc6State.jobState = projected.onboarding_state;
      }
      if (projected.selection_state === 'bound' && projected.bound_package) {
        uc6State.selectedPackageFamilyId = projected.bound_package_family_id;
        uc6State.selectedPackageId = projected.bound_package.package_id;
        uc6State.selectedPackageVersion = projected.bound_package.package_version;
      } else {
        const selectedFamily = getSelectedUC6PackageFamily(projected);
        if (!selectedFamily) {
          uc6State.selectedPackageFamilyId = '';
          uc6State.selectedPackageId = '';
          uc6State.selectedPackageVersion = '';
        } else {
          const matched = selectedFamily.variants.find((variant) => (
            variant.package_id === uc6State.selectedPackageId
            && variant.package_version === uc6State.selectedPackageVersion
          ));
          if (!matched) {
            uc6State.selectedPackageId = '';
            uc6State.selectedPackageVersion = '';
          }
        }
      }
      if (projected.compatibility_state === 'fresh_onboarding_not_ready') {
        uc6State.stageMessage = 'Fresh onboarding이 아직 진행 중입니다. 준비가 완료되면 호환 데이터 그룹을 불러옵니다.';
      } else if (projected.compatibility_state === 'fresh_onboarding_blocked') {
        uc6State.stageMessage = 'Fresh onboarding이 차단되어 데이터 그룹을 선택할 수 없습니다.';
      } else if (projected.compatibility_state === 'no_compatible_packages') {
        uc6State.stageMessage = 'Fresh same-job R1 topology는 준비되었지만 현재 호환되는 dummy-data 그룹이 없습니다.';
      } else if (uc6State.jobState === 'failed') {
        uc6State.stageMessage = '문서 생성 작업이 실패했습니다. 서버에 고정된 데이터 그룹과 시나리오를 확인한 후 다시 생성할 수 있습니다.';
      } else if (projected.compatibility_state === 'incompatible_source_pptx') {
        uc6State.stageMessage = '업로드한 PPTX와 호환되는 Template Profile을 확인할 수 없습니다.';
      } else if (projected.selection_state === 'bound') {
        uc6State.stageMessage = 'Template Profile이 확인되었으며 데이터 그룹과 시나리오가 서버에 고정되어 있습니다.';
      } else if (projected.package_family_count === 0) {
        uc6State.stageMessage = 'Template Profile은 확인되었지만 선택 가능한 데이터 그룹이 없습니다.';
      } else if (uc6State.selectedPackageFamilyId) {
        uc6State.stageMessage = '선택한 데이터 그룹에서 문서에 적용할 시나리오를 선택하세요.';
      } else {
        uc6State.stageMessage = 'Template Profile이 확인되었습니다. 사용할 데이터 그룹을 선택하세요.';
      }
      saveUC6LocalState();
      renderUC6All();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    }
  }

  async function submitUC6DummyRender(retryFailed = false) {
    if (!isUc6Authorized() || uc6State.operationInFlight || !uc6State.jobId) return;
    if (uc6State.packageOptions?.schema_version === UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA) {
      uc6State.stageMessage = 'Fresh package binding과 문서 생성 연결은 R6E에서 지원됩니다. 현재 선택은 로컬에만 저장됩니다.';
      renderUC6All();
      return;
    }
    const selectedFamily = getSelectedUC6PackageFamily();
    const selectedVariant = getSelectedUC6PackageVariant();
    if (!selectedFamily) {
      uc6State.stageMessage = '사용할 데이터 그룹을 선택하세요.';
      renderUC6All();
      return;
    }
    if (!selectedVariant) {
      uc6State.stageMessage = '선택한 데이터 그룹에서 시나리오를 선택하세요.';
      renderUC6All();
      return;
    }
    uc6State.operationInFlight = true;
    uc6State.renderSubmissionAmbiguous = false;
    uc6State.stageMessage = retryFailed ? '문서 생성을 다시 요청하고 있습니다.' : '선택한 데이터로 문서 생성 요청을 전송하고 있습니다.';
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const command = {
        package_id: uc6State.selectedPackageId,
        package_version: uc6State.selectedPackageVersion,
        retry_failed: retryFailed === true
      };
      const submitted = await uc6State.api.submitDummyDatabagRender(
        uc6State.jobId,
        command,
        { packageOptions: uc6State.packageOptions, signal: controller.signal }
      );
      const projected = projectUc6DummyDatabagRenderSubmission(submitted, { expectedJobId: uc6State.jobId });
      if (projected.bound_package) {
        uc6State.selectedPackageId = projected.bound_package.package_id;
        uc6State.selectedPackageVersion = projected.bound_package.package_version;
        reconcileUC6BoundPackageFamily(projected.bound_package);
      }
      uc6State.consecutivePollErrors = 0;

      if (projected.state === 'render_completed' || projected.state === 'failed') {
        uc6State.stageMessage = projected.state === 'render_completed'
          ? '완료된 생성 결과를 확인하고 있습니다.'
          : '실패한 생성 작업과 고정된 데이터 패키지를 확인하고 있습니다.';
        saveUC6LocalState();
        renderUC6All();
        await refreshUC6JobStatus();
      } else {
        uc6State.jobState = projected.state;
        saveUC6LocalState();
        renderUC6All();
        startUC6Polling();
      }
    } catch (error) {
      if (error?.name === 'Uc6AmbiguousSubmissionError' || error?.code === 'ambiguous_submission') {
        uc6State.jobState = 'render_unknown';
        uc6State.stageMessage = '생성 요청의 접수 여부를 확인할 수 없습니다.';
        setUC6LiveMessage(uc6State.stageMessage);
        saveUC6LocalState();
        renderUC6All();
        return;
      }
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    } finally {
      uc6State.operationInFlight = false;
      renderUC6All();
    }
  }

  async function submitUC6Analysis(retryFailed) {
    if (!isUc6Authorized() || uc6State.operationInFlight || !uc6State.jobId) return;
    if (!retryFailed && uc6State.analysisSubmittedForJobId === uc6State.jobId) return;
    uc6State.operationInFlight = true;
    uc6State.review = null;
    uc6State.decision = null;
    uc6State.decisionSubmitted = false;
    uc6State.decisionMode = false;
    uc6State.stageMessage = retryFailed ? '실패한 분석을 다시 요청하고 있습니다.' : '분석을 요청하고 있습니다.';
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const submitted = await uc6State.api.submitAnalysis(uc6State.jobId, { retryFailed: retryFailed === true, signal: controller.signal });
      uc6State.analysisSubmittedForJobId = uc6State.jobId;
      uc6State.jobState = submitted.state || uc6State.jobState || 'analysis_queued';
      uc6State.consecutivePollErrors = 0;
      uc6State.stageMessage = '분석 요청이 접수되었습니다. 상태를 확인하고 있습니다.';
      saveUC6LocalState();
      renderUC6All();
      startUC6Polling();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.stageMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.stageMessage);
      renderUC6All();
    } finally {
      uc6State.operationInFlight = false;
      renderUC6All();
    }
  }

  function startUC6Polling() {
    stopUC6Polling();
    if (uc6State.pollingAbortController) uc6State.pollingAbortController.abort();
    uc6State.pollingAbortController = new AbortController();
    scheduleUC6Poll(0);
  }

  function scheduleUC6Poll(delay = UC6_POLL_INTERVAL_MS) {
    stopUC6Polling();
    if (!isUc6Authorized() || !uc6State.jobId) return;
    uc6State.pollingTimer = setTimeout(() => {
      pollUC6JobStatus().catch(() => {});
    }, delay);
  }

  function isUC6FreshSourceReconciliationPending() {
    return uc6State.flowLane === 'dummy_render'
      && uc6State.freshOnboardingExpected === true
      && uc6State.jobState === 'source_ready';
  }

  function isUC6FreshSyntheticPollingPending() {
    return uc6State.flowLane === 'dummy_render'
      && uc6State.freshSyntheticExpected === true
      && (
        uc6State.syntheticGenerationState === 'generation_queued'
        || uc6State.syntheticGenerationState === 'generation_running'
        || (
          uc6State.syntheticGenerationState === 'not_started'
          && uc6State.syntheticGenerationSubmitted
          && !uc6State.syntheticGenerationSubmissionAmbiguous
        )
      );
  }

  function isUC6FreshRenderReconciliationPending() {
    const control = projectUc6FreshSyntheticRenderControl({
      selectionState: uc6State.syntheticSelectionState,
      boundScenario: uc6State.boundSyntheticScenario,
      publicState: uc6State.jobState,
      submitted: uc6State.freshRenderSubmitted,
      ambiguous: uc6State.freshRenderSubmissionAmbiguous,
      inFlight: uc6State.operationInFlight
    });
    return uc6State.flowLane === 'dummy_render'
      && uc6State.freshSyntheticExpected === true
      && control.renderPollable;
  }

  function isUC6FreshExecutionTerminal() {
    if (uc6State.flowLane !== 'dummy_render' || uc6State.freshSyntheticExpected !== true) return false;
    return projectUc6FreshRenderDeliveryControl({
      publicState: uc6State.jobState,
      deliveryStatus: uc6State.reviewArtifactsStatus
    }).executionTerminal;
  }

  function isUC6JobPollingPending() {
    if (isUC6FreshExecutionTerminal()) return false;
    const mapped = mapUc6StateToView(uc6State.jobState);
    return isUC6FreshSourceReconciliationPending()
      || isUC6FreshSyntheticPollingPending()
      || isUC6FreshRenderReconciliationPending()
      || ((uc6State.flowLane === 'dummy_render' || uc6State.flowLane === 'asset_render')
        ? (mapped.renderPollable || (uc6State.flowLane === 'dummy_render' && (mapped.onboardingPollable || mapped.syntheticScenariosPollable)))
        : mapped.pollable);
  }

  async function pollUC6JobStatus() {
    if (uc6State.statusRequestActive || !uc6State.pollingAbortController) return;
    uc6State.statusRequestActive = true;
    try {
      await refreshUC6JobStatus({ signal: uc6State.pollingAbortController.signal, fetchReview: uc6State.flowLane === 'legacy_analysis' });
      uc6State.consecutivePollErrors = 0;
      if (isUC6JobPollingPending()) scheduleUC6Poll();
      else stopUC6Polling();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) {
        stopUC6Polling();
        return;
      }
      if (error?.name !== 'AbortError') {
        uc6State.consecutivePollErrors += 1;
        if (uc6State.consecutivePollErrors >= UC6_MAX_TRANSIENT_ERRORS) {
          stopUC6Polling();
          uc6State.stageMessage = '상태 확인을 잠시 중단했습니다. 수동으로 다시 시작할 수 있습니다.';
          setUC6LiveMessage(uc6State.stageMessage);
        } else {
          scheduleUC6Poll();
        }
      }
    } finally {
      uc6State.statusRequestActive = false;
      renderUC6All();
    }
  }

  async function refreshUC6JobStatus(options = {}) {
    if (!isUc6Authorized() || !uc6State.jobId) return;
    const rawJob = await uc6State.api.getJob(uc6State.jobId, { signal: options.signal });

    const authoritativeDummyRenderLane = rawJob
      && typeof rawJob === 'object'
      && (
        rawJob.state === 'render_queued'
        || rawJob.state === 'render_running'
        || rawJob.state === 'render_completed'
        || (rawJob.render && typeof rawJob.render === 'object')
      );
    const authoritativeFreshOnboardingLane = rawJob
      && typeof rawJob === 'object'
      && (
        rawJob.state === 'onboarding_queued'
        || rawJob.state === 'onboarding_running'
        || rawJob.state === 'onboarding_ready'
        || rawJob.state === 'onboarding_blocked'
        || rawJob.state === 'synthetic_scenarios_queued'
        || rawJob.state === 'synthetic_scenarios_running'
        || rawJob.state === 'synthetic_scenarios_ready'
        || rawJob.state === 'synthetic_scenario_bound'
        || rawJob.state === 'synthetic_scenarios_failed'
      );
    const authoritativeFreshRenderLane = rawJob
      && typeof rawJob === 'object'
      && uc6State.freshSyntheticExpected === true
      && (
        rawJob.state === 'render_queued'
        || rawJob.state === 'render_running'
        || rawJob.state === 'render_completed'
        || rawJob.state === 'failed'
      );

    if (authoritativeFreshOnboardingLane && uc6State.flowLane !== 'asset_render') {
      uc6State.flowLane = 'dummy_render';
      uc6State.freshOnboardingExpected = true;
      if (rawJob.state === 'onboarding_ready' || String(rawJob.state || '').startsWith('synthetic_')) {
        uc6State.freshSyntheticExpected = true;
      }
      uc6State.review = null;
      uc6State.decision = null;
      uc6State.decisionMode = false;
      clearUC6FinalDeliveryState();
      clearUC6A8FReviewState({ keepDecisionIdentity: true });
    }

    if (authoritativeDummyRenderLane && uc6State.flowLane !== 'dummy_render' && uc6State.flowLane !== 'asset_render') {
      uc6State.flowLane = 'dummy_render';
      uc6State.review = null;
      uc6State.decision = null;
      uc6State.decisionMode = false;
      clearUC6FinalDeliveryState();
      clearUC6A8FReviewState({ keepDecisionIdentity: true });
    }

    if (uc6State.flowLane === 'asset_render') {
      const projectorOptions = { expectedJobId: uc6State.jobId, expectedAssetId: uc6State.selectedAssetId };
      const projected = uc6State.assetSourceLane === 'published_scenario_family'
        ? projectUc6PublishedAssetScenarioRenderJobStatus(rawJob, projectorOptions)
        : projectUc6ReusableAssetRenderJobStatus(rawJob, projectorOptions);
      uc6State.jobState = projected.state;
      uc6State.source = projected.source;
      uc6State.lastPollingTimestamp = Date.now();
      uc6State.renderStatus = projected.state === 'render_completed' ? projected : null;
      if (projected.bound_package) {
        uc6State.selectedPackageId = projected.bound_package.package_id;
        uc6State.selectedPackageVersion = projected.bound_package.package_version;
      }
      if (projected.linked_scenario_family) {
        uc6State.selectedPublishedScenarioFamilyId = projected.linked_scenario_family.published_scenario_family_id;
        uc6State.selectedPublishedScenarioKey = projected.linked_scenario_family.scenario_key;
      }
      if (projected.state === 'render_queued') {
        uc6State.stageMessage = uc6State.assetSourceLane === 'published_scenario_family'
          ? '선택한 Scenario Family 문서 생성 요청이 대기열에 있습니다.'
          : '게시 Asset 문서 생성 요청이 대기열에 있습니다.';
      } else if (projected.state === 'render_running') {
        uc6State.stageMessage = uc6State.assetSourceLane === 'published_scenario_family'
          ? 'Source Context를 바탕으로 Slot을 생성하고 PPTX/PDF를 렌더하고 있습니다.'
          : '선택한 데이터 패키지로 PPTX/PDF를 렌더하고 있습니다.';
      } else if (projected.state === 'render_completed') {
        uc6State.stageMessage = '문서 생성이 완료되었습니다.';
      } else if (projected.state === 'failed') {
        uc6State.stageMessage = '문서 생성 작업이 실패했습니다. 자동으로 다시 요청하지 않습니다.';
      }
      saveUC6LocalState();
      renderUC6All();
      if (projected.state === 'render_completed' && uc6State.reviewArtifactsStatus !== 'ready') {
        await loadUC6A8HDeliveryState(options.signal);
      }
      return;
    }

    if (uc6State.flowLane === 'dummy_render') {
      if (authoritativeFreshRenderLane) {
        const projected = projectUc6FreshSyntheticRenderJobStatus(rawJob, { expectedJobId: uc6State.jobId });
        uc6State.jobState = projected.state;
        uc6State.source = projected.source;
        uc6State.lastPollingTimestamp = Date.now();
        uc6State.freshRenderSubmitted = true;
        uc6State.freshRenderSubmissionAmbiguous = false;
        uc6State.renderStatus = projected.state === 'render_completed' ? projected : null;
        const deliveryControl = projectUc6FreshRenderDeliveryControl({
          publicState: projected.state,
          deliveryStatus: uc6State.reviewArtifactsStatus
        });
        if (deliveryControl.executionTerminal) stopUC6Polling();
        if (!deliveryControl.executionTerminal) clearUC6A8FReviewState({ keepDecisionIdentity: false });
        if (projected.state === 'render_queued') {
          uc6State.stageMessage = '샘플 문서 생성 요청이 대기열에 있습니다.';
        } else if (projected.state === 'render_running') {
          uc6State.stageMessage = '선택한 샘플 컨텍스트로 PPTX와 PDF를 생성하고 있습니다.';
        } else if (projected.state === 'render_completed') {
          uc6State.stageMessage = projected.review_required
            ? '문서 생성이 완료되었습니다. 일부 항목은 근거 데이터 부족으로 원본 내용을 유지했으므로 검토가 필요합니다.'
            : '샘플 문서 생성이 완료되었습니다.';
        } else {
          uc6State.stageMessage = '샘플 문서 생성 작업이 완료되지 않았습니다. 서버 상태를 확인한 뒤 새 문서로 다시 시작할 수 있습니다.';
        }
        saveUC6LocalState();
        renderUC6All();
        if (deliveryControl.shouldResolveCapabilities) {
          await loadUC6FreshRenderDeliveryState(options.signal);
        }
        if (deliveryControl.executionTerminal && projected.state === 'render_completed' && uc6State.publicationStatus === 'idle') {
          await loadUC6FreshPublicationState(options.signal);
        }
        return;
      }
      if (authoritativeFreshOnboardingLane) {
        const projected = projectUc6FreshTemplateOnboardingJobStatus(rawJob, { expectedJobId: uc6State.jobId });
        uc6State.jobState = projected.state;
        uc6State.source = projected.source;
        uc6State.lastPollingTimestamp = Date.now();
        uc6State.renderStatus = null;
        uc6State.onboardingSubmissionAmbiguous = false;
        if (projected.state === 'onboarding_ready') {
          uc6State.stageMessage = 'Fresh onboarding이 완료되었습니다. 합성 샘플 컨텍스트 상태를 확인하고 있습니다.';
          saveUC6LocalState();
          await reconcileUC6FreshSyntheticScenarios({ signal: options.signal, allowSubmit: true });
        } else if (projected.state === 'onboarding_blocked') {
          stopUC6Polling();
          uc6State.packageOptions = null;
          resetUC6FreshSyntheticState();
          uc6State.stageMessage = 'Fresh onboarding을 완료할 수 없습니다. 새 PPTX를 선택하거나 작업 상태를 다시 확인하세요.';
          saveUC6LocalState();
          renderUC6All();
        } else if (String(projected.state).startsWith('synthetic_')) {
          const synthetic = await reconcileUC6FreshSyntheticScenarios({ signal: options.signal, allowSubmit: false });
          if (
            synthetic.selection_state === 'bound'
            && uc6State.freshRenderSubmissionAmbiguous
            && options.renderSubmissionReconciliation !== true
          ) {
            uc6State.freshRenderSubmitted = false;
            uc6State.freshRenderSubmissionAmbiguous = false;
            uc6State.stageMessage = '서버가 생성 요청을 접수하지 않은 것으로 확인되었습니다. 필요하면 샘플 문서 생성을 다시 요청하세요.';
            saveUC6LocalState();
            renderUC6All();
          }
        } else {
          uc6State.packageOptions = null;
          uc6State.stageMessage = 'Fresh onboarding이 진행 중입니다. 준비 상태를 계속 확인합니다.';
          saveUC6LocalState();
          renderUC6All();
        }
        return;
      }
      const projected = projectUc6DummyDatabagRenderJobStatus(rawJob, { expectedJobId: uc6State.jobId });
      uc6State.jobState = projected.state;
      if (projected.source) uc6State.source = projected.source;
      uc6State.lastPollingTimestamp = Date.now();
      uc6State.renderStatus = projected.state === 'render_completed' ? projected : null;

      if (projected.bound_package) {
        uc6State.selectedPackageId = projected.bound_package.package_id;
        uc6State.selectedPackageVersion = projected.bound_package.package_version;
        if (uc6State.packageOptions) {
          reconcileUC6BoundPackageFamily(projected.bound_package);
        }
      }

      if (projected.state === 'source_ready' && uc6State.freshOnboardingExpected) {
        uc6State.packageOptions = null;
        uc6State.stageMessage = 'Fresh onboarding 접수 상태를 조정 중입니다. POST를 다시 보내지 않고 서버 작업 상태만 확인합니다.';
      } else if (projected.state === 'failed' || projected.state === 'source_ready') {
        await loadUC6PackageOptions(options.signal);
      }

      saveUC6LocalState();
      renderUC6All();
      if (projected.state === 'render_completed' && (!uc6State.reviewArtifacts || !uc6State.publication)) {
        await loadUC6A8FReviewState(options.signal);
      }
      return;
    }

    uc6State.jobState = rawJob.state || uc6State.jobState;
    if (rawJob.source) uc6State.source = rawJob.source;
    uc6State.lastPollingTimestamp = Date.now();
    saveUC6LocalState();
    const mapped = mapUc6StateToView(uc6State.jobState);
    if (options.fetchReview && mapped.reviewReady) await fetchUC6Review(options.signal);
    if (uc6State.jobState === 'approved') await fetchUC6FinalDeliveryCapabilities(options.signal);
    else clearUC6FinalDeliveryState();
    renderUC6All();
  }


  const UC6_REVIEW_ARTIFACT_DOWNLOAD_SPECS = Object.freeze({
    final_render_output_pdf: Object.freeze({
      label: 'PDF',
      renderKey: 'pdf',
      mediaType: 'application/pdf'
    }),
    final_render_output_pptx: Object.freeze({
      label: 'PowerPoint',
      renderKey: 'pptx',
      mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    })
  });

  function createUC6ReviewArtifactDownloadError(code, publicMessage) {
    const error = new Error(code);
    error.name = 'Uc6ReviewArtifactDownloadError';
    error.code = code;
    error.publicMessage = publicMessage;
    return error;
  }

  function updateUC6ReviewArtifactDownloadSurface() {
    const root = uc6Els.activeStageRoot;
    if (!root) return;
    const activeAlias = uc6State.reviewArtifactDownloadActive;
    root.querySelectorAll('button[data-uc6-artifact-download]').forEach((button) => {
      const alias = button.dataset.uc6ArtifactDownload || '';
      button.disabled = Boolean(activeAlias);
      button.textContent = activeAlias === alias ? '다운로드 준비 중...' : '다운로드';
    });
    const status = root.querySelector('#uc6-reviewArtifactDownloadStatus');
    if (status) {
      status.textContent = uc6State.reviewArtifactDownloadMessage || '';
      status.hidden = !uc6State.reviewArtifactDownloadMessage;
    }
  }

  function triggerUC6ReviewArtifactDownload(blob, suggestedFilename) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = suggestedFilename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  async function consumeUC6ReviewArtifactDownload(capability, spec, expectedArtifact, signal) {
    const response = await fetch(capability.actions.download.href, {
      method: 'GET',
      headers: { Accept: spec.mediaType },
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal
    });
    if (response.status === 410) {
      throw createUC6ReviewArtifactDownloadError(
        'review_artifact_capability_expired',
        '다운로드 권한이 만료되어 새 권한을 발급하고 있습니다.'
      );
    }
    if (!response.ok) {
      throw createUC6ReviewArtifactDownloadError(
        'review_artifact_download_failed',
        '산출물 다운로드를 시작하지 못했습니다. 다시 시도하세요.'
      );
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith(spec.mediaType.toLowerCase())) {
      throw createUC6ReviewArtifactDownloadError(
        'review_artifact_media_type_mismatch',
        '산출물 형식을 확인하지 못해 다운로드를 중단했습니다.'
      );
    }
    const blob = await response.blob();
    if (Number.isSafeInteger(expectedArtifact?.size_bytes) && blob.size !== expectedArtifact.size_bytes) {
      throw createUC6ReviewArtifactDownloadError(
        'review_artifact_size_mismatch',
        '산출물 크기가 검토 기록과 일치하지 않아 다운로드를 중단했습니다.'
      );
    }
    triggerUC6ReviewArtifactDownload(blob, capability.suggestedFilename);
  }

  async function downloadUC6ReviewArtifact(artifactAlias) {
    const spec = UC6_REVIEW_ARTIFACT_DOWNLOAD_SPECS[artifactAlias];
    if (
      !spec
      || !isUc6Authorized()
      || !uc6State.jobId
      || !uc6State.renderStatus
      || uc6State.reviewArtifactDownloadActive
    ) return;

    const expectedArtifact = uc6State.renderStatus.final_artifacts?.[spec.renderKey];
    if (!expectedArtifact) {
      uc6State.reviewArtifactDownloadMessage = '다운로드할 산출물 정보를 확인하지 못했습니다.';
      updateUC6ReviewArtifactDownloadSurface();
      return;
    }

    if (uc6State.reviewArtifactDownloadAbortController) {
      uc6State.reviewArtifactDownloadAbortController.abort();
    }
    const controller = new AbortController();
    uc6State.reviewArtifactDownloadAbortController = controller;
    uc6State.reviewArtifactDownloadActive = artifactAlias;
    uc6State.reviewArtifactDownloadMessage = `${spec.label} 다운로드 권한을 갱신하고 있습니다.`;
    updateUC6ReviewArtifactDownloadSurface();

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const payload = uc6State.flowLane === 'asset_render' || uc6State.freshSyntheticExpected
          ? await uc6State.api.getRenderArtifactCapabilities(uc6State.jobId, { signal: controller.signal })
          : await uc6State.api.getReviewArtifactCapabilities(uc6State.jobId, { signal: controller.signal });
        const capabilities = projectUc6FinalDeliveryCapabilities(payload, {
          expectedJobId: uc6State.jobId,
          apiBaseUrl: CONFIG.UC6_BROWSER_ADMIN_API_BASE
        });
        const capability = capabilities.artifacts.find((artifact) => artifact.alias === artifactAlias);
        if (!capability?.ready || !capability.actions.download.available || !capability.actions.download.href) {
          throw createUC6ReviewArtifactDownloadError(
            'review_artifact_download_unavailable',
            '요청한 산출물은 아직 다운로드할 수 없습니다.'
          );
        }
        uc6State.reviewArtifacts = capabilities;
        uc6State.reviewArtifactsStatus = 'ready';
        try {
          await consumeUC6ReviewArtifactDownload(capability, spec, expectedArtifact, controller.signal);
          uc6State.reviewArtifactDownloadMessage = `${spec.label} 다운로드를 시작했습니다.`;
          break;
        } catch (error) {
          if (error?.code === 'review_artifact_capability_expired' && attempt === 0) continue;
          throw error;
        }
      }
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      uc6State.reviewArtifactDownloadMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.reviewArtifactDownloadMessage);
    } finally {
      if (uc6State.reviewArtifactDownloadAbortController === controller) {
        uc6State.reviewArtifactDownloadAbortController = null;
      }
      uc6State.reviewArtifactDownloadActive = '';
      updateUC6ReviewArtifactDownloadSurface();
    }
  }

  function projectUC6Publication(payload) {
    return uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected
      ? projectUc6FreshReusableAssetPublication(payload, { expectedJobId: uc6State.jobId })
      : projectUc6ReusableAssetPublication(payload, { expectedJobId: uc6State.jobId });
  }

  function assertUC6PublicationArtifactParity(publication) {
    const renderStatus = uc6State.renderStatus;
    if (!renderStatus) throw new TypeError('review_artifacts_not_ready');
    const expectedPdf = renderStatus.final_artifacts?.pdf?.sha256;
    const expectedPptx = renderStatus.final_artifacts?.pptx?.sha256;
    const publicationPdf = publication.publication_state === 'published'
      ? publication.published_asset?.reviewed_final_pdf_sha256
      : publication.reviewed_final_pdf_sha256;
    const publicationPptx = publication.publication_state === 'published'
      ? publication.published_asset?.reviewed_final_pptx_sha256
      : publication.reviewed_final_pptx_sha256;
    if (expectedPdf !== publicationPdf || expectedPptx !== publicationPptx) {
      throw new TypeError('review_artifact_sha_mismatch');
    }
  }

  function assertUC6ReviewArtifactParity(capabilities, publication) {
    const pdf = capabilities?.artifacts?.find((artifact) => artifact.alias === 'final_render_output_pdf');
    const pptx = capabilities?.artifacts?.find((artifact) => artifact.alias === 'final_render_output_pptx');
    if (!pdf?.ready || !pptx?.ready) throw new TypeError('review_artifacts_not_ready');
    assertUC6PublicationArtifactParity(publication);
  }

  function hasUC6PublicationArtifactParity(publication) {
    try {
      assertUC6PublicationArtifactParity(publication);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function loadUC6FreshPublicationState(signal, options = {}) {
    if (
      !isUc6Authorized()
      || uc6State.flowLane !== 'dummy_render'
      || !uc6State.freshSyntheticExpected
      || !uc6State.jobId
      || uc6State.jobState !== 'render_completed'
      || !uc6State.renderStatus
      || uc6State.reviewSurfaceRequestActive
      || (!options.explicitRefresh && uc6State.publicationStatus !== 'idle')
    ) return;
    uc6State.reviewSurfaceRequestActive = true;
    uc6State.publicationStatus = 'loading';
    uc6State.publicationMessage = 'Fresh 관리자 게시 준비 상태를 확인하고 있습니다.';
    renderUC6FreshPublicationSurfaceOnly();
    try {
      const payload = await uc6State.api.getReusableAssetPublication(uc6State.jobId, { signal });
      const publication = projectUc6FreshReusableAssetPublication(payload, { expectedJobId: uc6State.jobId });
      assertUC6PublicationArtifactParity(publication);
      uc6State.publication = publication;
      uc6State.publicationStatus = publication.publication_state === 'published' ? 'published' : 'review_pending';
      uc6State.publicationMessage = publication.publication_state === 'published'
        ? '재사용 Asset과 연결된 Scenario Family 게시가 완료되었습니다.'
        : '표시된 최종 PPTX/PDF를 검토한 뒤 명시적으로 게시하세요.';
      if (publication.publication_state === 'published') {
        uc6State.publicationReviewConfirmed = true;
        if (publication.published_asset?.decision_identity) {
          uc6State.publicationDecisionIdentity = publication.published_asset.decision_identity;
        }
      }
      saveUC6LocalState();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      uc6State.publication = null;
      uc6State.publicationStatus = error?.message === 'review_artifact_sha_mismatch'
        ? 'reconciliation_required'
        : 'error';
      uc6State.publicationMessage = error?.message === 'review_artifact_sha_mismatch'
        ? '게시 준비 정보와 표시된 최종 산출물 SHA-256이 일치하지 않아 게시할 수 없습니다.'
        : uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.publicationMessage);
    } finally {
      uc6State.reviewSurfaceRequestActive = false;
      renderUC6FreshPublicationSurfaceOnly();
    }
  }

  async function loadUC6A8FReviewState(signal) {
    if (
      !isUc6Authorized()
      || !uc6State.jobId
      || uc6State.jobState !== 'render_completed'
      || !uc6State.renderStatus
      || uc6State.reviewSurfaceRequestActive
    ) return;
    uc6State.reviewSurfaceRequestActive = true;
    uc6State.reviewArtifactsStatus = 'loading';
    uc6State.publicationStatus = 'loading';
    uc6State.reviewArtifactsMessage = '관리자 검토용 PDF를 준비하고 있습니다.';
    uc6State.publicationMessage = '승인·게시 상태를 확인하고 있습니다.';
    renderUC6All();
    try {
      const [capabilityResult, publicationResult] = await Promise.allSettled([
        uc6State.api.getReviewArtifactCapabilities(uc6State.jobId, { signal }),
        uc6State.api.getReusableAssetPublication(uc6State.jobId, { signal })
      ]);
      const rejected = [capabilityResult, publicationResult]
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason);
      for (const error of rejected) {
        if (handleUC6AuthorizationFailure(error)) return;
        if (error?.name === 'AbortError') return;
      }

      let capabilities = null;
      let publication = null;
      let capabilityError = null;
      let publicationError = null;

      if (capabilityResult.status === 'fulfilled') {
        try {
          capabilities = projectUc6FinalDeliveryCapabilities(capabilityResult.value, {
            expectedJobId: uc6State.jobId,
            apiBaseUrl: CONFIG.UC6_BROWSER_ADMIN_API_BASE
          });
        } catch (error) {
          capabilityError = error;
        }
      } else {
        capabilityError = capabilityResult.reason;
      }

      if (publicationResult.status === 'fulfilled') {
        try {
          publication = projectUc6ReusableAssetPublication(publicationResult.value, {
            expectedJobId: uc6State.jobId
          });
        } catch (error) {
          publicationError = error;
        }
      } else {
        publicationError = publicationResult.reason;
      }

      if (capabilities && publication) {
        try {
          assertUC6ReviewArtifactParity(capabilities, publication);
        } catch (error) {
          capabilityError = error;
          publicationError = error;
          capabilities = null;
          publication = null;
        }
      }

      if (capabilities) {
        uc6State.reviewArtifacts = capabilities;
        uc6State.reviewArtifactsStatus = 'ready';
        uc6State.reviewArtifactsMessage = '관리자 검토용 산출물이 준비되었습니다.';
      } else {
        uc6State.reviewArtifacts = null;
        uc6State.reviewArtifactsStatus = 'error';
        uc6State.reviewArtifactsMessage = uc6MessageFromError(capabilityError);
      }

      if (publication) {
        uc6State.publication = publication;
        uc6State.publicationStatus = 'ready';
        uc6State.publicationMessage = publication.publication_state === 'published'
          ? '승인 및 게시가 완료되었습니다.'
          : 'PDF를 검토한 뒤 명시적으로 승인·게시하세요.';
        if (publication.publication_state === 'published') {
          uc6State.publicationReviewConfirmed = true;
          if (publication.published_asset?.decision_identity) {
            uc6State.publicationDecisionIdentity = publication.published_asset.decision_identity;
          }
        }
      } else {
        uc6State.publication = null;
        uc6State.publicationStatus = 'error';
        uc6State.publicationMessage = uc6MessageFromError(publicationError);
      }

      const surfacedError = publicationError || capabilityError;
      if (surfacedError) setUC6LiveMessage(uc6MessageFromError(surfacedError));
      saveUC6LocalState();
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      if (error?.name === 'AbortError') return;
      const message = uc6MessageFromError(error);
      if (uc6State.reviewArtifactsStatus === 'loading') {
        uc6State.reviewArtifacts = null;
        uc6State.reviewArtifactsStatus = 'error';
        uc6State.reviewArtifactsMessage = message;
      }
      if (uc6State.publicationStatus === 'loading') {
        uc6State.publication = null;
        uc6State.publicationStatus = 'error';
        uc6State.publicationMessage = message;
      }
      setUC6LiveMessage(message);
    } finally {
      uc6State.reviewSurfaceRequestActive = false;
      renderUC6All();
    }
  }

  async function reconcileUC6PublicationState(signal) {
    const payload = await uc6State.api.getReusableAssetPublication(uc6State.jobId, { signal });
    const publication = projectUC6Publication(payload);
    if (uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected) {
      assertUC6PublicationArtifactParity(publication);
    } else {
      assertUC6ReviewArtifactParity(uc6State.reviewArtifacts, publication);
    }
    uc6State.publication = publication;
    uc6State.publicationStatus = uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected
      ? (publication.publication_state === 'published' ? 'published' : 'review_pending')
      : 'ready';
    uc6State.publicationMessage = publication.publication_state === 'published'
      ? '서버 상태 확인 결과 승인 및 게시가 완료되었습니다.'
      : '서버 상태는 아직 미게시입니다. 동일한 승인 식별자로 다시 시도할 수 있습니다.';
    if (publication.publication_state === 'published') uc6State.publicationReviewConfirmed = true;
    saveUC6LocalState();
    renderUC6PublicationSurfaceOnly();
    return publication;
  }

  function renderUC6PublicationSurfaceOnly() {
    if (uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected) {
      renderUC6FreshPublicationSurfaceOnly();
    } else {
      renderUC6A8FReviewSurfaceOnly();
    }
  }

  async function submitUC6ReusableAssetPublication() {
    if (
      !isUc6Authorized()
      || !uc6State.jobId
      || uc6State.jobState !== 'render_completed'
      || uc6State.publicationRequestActive
      || uc6State.publication?.publication_state === 'published'
    ) return;
    if (!uc6State.publication || !hasUC6PublicationArtifactParity(uc6State.publication)) {
      uc6State.publicationStatus = 'reconciliation_required';
      uc6State.publicationMessage = '게시 준비 정보와 표시된 최종 산출물 SHA-256 일치를 먼저 확인하세요.';
      renderUC6PublicationSurfaceOnly();
      return;
    }
    if (!uc6State.publicationReviewConfirmed) {
      uc6State.publicationMessage = 'PDF 검토 완료 확인이 필요합니다.';
      renderUC6PublicationSurfaceOnly();
      return;
    }
    const command = {
      decision: 'approve_for_reuse_and_publish',
      decision_identity: ensureUC6PublicationDecisionIdentity(),
      reviewed_final_pptx_sha256: uc6State.renderStatus?.final_artifacts?.pptx?.sha256,
      reviewed_final_pdf_sha256: uc6State.renderStatus?.final_artifacts?.pdf?.sha256,
      administrator_note: uc6State.publicationNoteDraft
    };
    const validation = validateUc6ReusableAssetPublicationCommand(command);
    if (!validation.ok) {
      uc6State.publicationMessage = validation.message;
      renderUC6PublicationSurfaceOnly();
      return;
    }
    uc6State.publicationRequestActive = true;
    uc6State.publicationStatus = 'submitting';
    uc6State.publicationMessage = '검토한 산출물을 승인하고 게시하고 있습니다.';
    saveUC6LocalState();
    renderUC6PublicationSurfaceOnly();
    if (uc6State.publicationAbortController) uc6State.publicationAbortController.abort();
    uc6State.publicationAbortController = new AbortController();
    try {
      const payload = await uc6State.api.submitReusableAssetPublication(
        uc6State.jobId,
        validation.body,
        { signal: uc6State.publicationAbortController.signal }
      );
      const publication = projectUC6Publication(payload);
      if (uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected) {
        assertUC6PublicationArtifactParity(publication);
      } else {
        assertUC6ReviewArtifactParity(uc6State.reviewArtifacts, publication);
      }
      if (publication.publication_state !== 'published') throw new TypeError('publication_not_completed');
      uc6State.publication = publication;
      uc6State.publicationStatus = uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected ? 'published' : 'ready';
      uc6State.publicationMessage = publication.idempotent_replay === true
        ? '기존 승인·게시 결과를 안전하게 복원했습니다.'
        : '승인 및 게시가 완료되었습니다.';
      setUC6LiveMessage(uc6State.publicationMessage);
      saveUC6LocalState();
    } catch (error) {
      if (error?.name === 'Uc6AmbiguousSubmissionError' || error?.code === 'ambiguous_submission') {
        uc6State.publicationStatus = 'reconciling';
        uc6State.publicationMessage = '승인 요청 결과가 불명확하여 서버 상태를 확인하고 있습니다.';
        renderUC6PublicationSurfaceOnly();
        try {
          await reconcileUC6PublicationState(uc6State.publicationAbortController.signal);
        } catch (readError) {
          if (handleUC6AuthorizationFailure(readError)) return;
          if (readError?.name !== 'AbortError') {
            uc6State.publicationStatus = 'reconciliation_required';
            uc6State.publicationMessage = '승인 요청 결과를 확인하지 못했습니다. 상태를 새로고침하세요.';
          }
        }
      } else if (!handleUC6AuthorizationFailure(error) && error?.name !== 'AbortError') {
        uc6State.publicationStatus = 'error';
        uc6State.publicationMessage = uc6MessageFromError(error);
        setUC6LiveMessage(uc6State.publicationMessage);
      }
    } finally {
      uc6State.publicationRequestActive = false;
      renderUC6PublicationSurfaceOnly();
    }
  }

  async function fetchUC6FinalDeliveryCapabilities(signal) {
    if (!isUc6Authorized() || !uc6State.jobId || uc6State.jobState !== 'approved' || uc6State.finalDeliveryRequestActive) return;
    uc6State.finalDelivery = null;
    uc6State.finalDeliveryStatus = 'loading';
    uc6State.finalDeliveryMessage = '최종 산출물 상태를 확인하고 있습니다.';
    uc6State.finalDeliveryRequestActive = true;
    setUC6LiveMessage(uc6State.finalDeliveryMessage);
    renderUC6All();
    const requestJobId = uc6State.jobId;
    try {
      const payload = await uc6State.api.getFinalDeliveryCapabilities(requestJobId, { signal });
      const projected = projectUc6FinalDeliveryCapabilities(payload, {
        expectedJobId: requestJobId,
        apiBaseUrl: CONFIG.UC6_BROWSER_ADMIN_API_BASE
      });
      if (uc6State.jobId !== requestJobId || uc6State.jobState !== 'approved') return;
      uc6State.finalDelivery = projected;
      uc6State.finalDeliveryStatus = 'ready';
      if (projected.readyCount === projected.totalCount) {
        uc6State.finalDeliveryMessage = '최종 산출물 2개가 준비되었습니다.';
      } else if (projected.readyCount > 0) {
        uc6State.finalDeliveryMessage = `최종 산출물 ${projected.readyCount}/2개가 준비되었습니다.`;
      } else {
        uc6State.finalDeliveryMessage = '최종 산출물이 아직 준비되지 않았습니다. 생성 단계가 완료되면 상태를 다시 확인할 수 있습니다.';
      }
      setUC6LiveMessage(uc6State.finalDeliveryMessage);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      clearUC6FinalDeliveryState();
      uc6State.finalDeliveryStatus = 'error';
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.finalDeliveryMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.finalDeliveryMessage);
    } finally {
      uc6State.finalDeliveryRequestActive = false;
      uc6State.finalDeliveryAbortController = null;
      renderUC6All();
    }
  }

  async function fetchUC6Review(signal) {
    if (!isUc6Authorized() || !uc6State.jobId) return;
    try {
      const review = await uc6State.api.getReview(uc6State.jobId, { signal });
      uc6State.review = {
        job_id: review.job_id,
        state: review.state,
        schema_version: review.schema_version,
        status: review.status,
        global_readiness_status: review.global_readiness_status,
        blocking_issue_count: review.blocking_issue_count,
        warning_count: review.warning_count,
        public_review_surface: review.public_review_surface,
        runtime_readiness_summary: review.runtime_readiness_summary,
        current_decision_summary: review.current_decision_summary,
        review_package_sha256: review.review_package_sha256,
        control_plane_contract_version: review.control_plane_contract_version
      };
      uc6State.reviewMessage = '검토 결과가 준비되었습니다.';
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.reviewMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.reviewMessage);
      renderUC6All();
    }
  }

  async function submitUC6Decision() {
    if (!isUc6Authorized() || uc6State.operationInFlight || uc6State.decisionSubmitted || !uc6State.jobId) return;
    let reviewNotes;
    let requestedRevisions;
    try {
      reviewNotes = splitDecisionTextLines(uc6Els.reviewNotes?.value || uc6State.reviewNotesDraft || '');
      requestedRevisions = splitDecisionTextLines(uc6Els.requestedRevisions?.value || uc6State.requestedRevisionsDraft || '');
    } catch (error) {
      uc6State.decisionMessage = error?.message === 'too_many_decision_entries' ? '입력 항목은 최대 20개까지 허용됩니다.' : '각 입력 항목은 1000자 이하로 작성하세요.';
      renderUC6All();
      return;
    }
    const decision = uc6Els.decisionChoice?.value || uc6State.decisionChoiceValue || '';
    const validation = validateUc6DecisionCommand({
      state: uc6State.jobState,
      decision,
      review_notes: reviewNotes,
      requested_revisions: requestedRevisions
    });
    if (!validation.ok) {
      uc6State.decisionMessage = validation.message;
      renderUC6All();
      return;
    }
    uc6State.operationInFlight = true;
    uc6State.decisionMessage = '검토 결정을 제출하고 있습니다.';
    renderUC6All();
    const controller = createUC6OperationController();
    try {
      const submitted = await uc6State.api.submitDecision(uc6State.jobId, {
        state: uc6State.jobState,
        decision,
        review_notes: reviewNotes,
        requested_revisions: requestedRevisions
      }, { signal: controller.signal });
      uc6State.decision = {
        job_id: submitted.job_id,
        state: submitted.state,
        decision: submitted.decision,
        created: submitted.created,
        control_plane_contract_version: submitted.control_plane_contract_version
      };
      uc6State.jobState = submitted.state || uc6State.jobState;
      uc6State.decisionSubmitted = true;
      uc6State.decisionMode = false;
      uc6State.decisionMessage = `${UC6_DECISION_LABELS[decision]} 결정이 기록되었습니다.`;
      saveUC6LocalState();
      await refreshUC6JobStatus({ fetchReview: true });
    } catch (error) {
      if (handleUC6AuthorizationFailure(error)) return;
      uc6State.decisionMessage = uc6MessageFromError(error);
      setUC6LiveMessage(uc6State.decisionMessage);
      renderUC6All();
    } finally {
      uc6State.operationInFlight = false;
      renderUC6All();
    }
  }

  function renderUC6Session() {
    const authorized = isUc6Authorized();
    if (uc6Els.signInBtn) uc6Els.signInBtn.disabled = uc6State.authStatus === 'authenticating' || uc6State.authStatus === 'authorizing' || authorized;
    if (uc6Els.signOutBtn) uc6Els.signOutBtn.disabled = !uc6State.firebaseUser;
    if (uc6Els.refreshSessionBtn) uc6Els.refreshSessionBtn.disabled = !uc6State.firebaseUser || uc6State.authStatus === 'authorizing';
  }

  function renderUC6Stepper(stage) {
    if (!uc6Els.stepper) return;
    uc6Els.stepper.hidden = !isUc6Authorized();
    const steps = uc6State.flowLane === 'asset_render'
      ? UC6_A8H_STAGE_STEPS
      : uc6State.flowLane === 'dummy_render'
        ? (uc6State.freshSyntheticExpected ? UC6_R6E_D2_STAGE_STEPS : UC6_A8E_STAGE_STEPS)
        : UC6_STAGE_STEPS;
    const stepStage = stage === 'analysis_error' ? 'analysis' : (stage === 'render_error' || stage === 'render_unknown') ? 'render' : stage;
    const currentIndex = Math.max(0, steps.findIndex((step) => step.key === stepStage));
    const ol = uc6Els.stepper.querySelector('ol');
    if (!ol) return;
    if (ol.querySelectorAll('li').length !== steps.length) {
      ol.replaceChildren(...steps.map((step, index) => {
        const item = createUc6Node('li', '');
        item.dataset.uc6Step = step.key;
        item.append(createUc6Node('span', '', index + 1), createUc6Node('strong', '', step.label));
        return item;
      }));
    }
    ol.querySelectorAll('li').forEach((item, index) => {
      const stepDef = steps[index];
      item.dataset.uc6Step = stepDef.key;
      const span = item.querySelector('span');
      const strong = item.querySelector('strong');
      if (span) span.textContent = String(index + 1);
      if (strong) strong.textContent = stepDef.label;
      const state = index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming';
      item.dataset.state = state;
      if (state === 'current') item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  }

  function renderUC6AuthStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card uc6-auth-stage');
    card.append(createUc6Node('h2', '', '관리자 로그인 필요'));
    const copy = UC6_AUTH_COPY[uc6State.authStatus] || UC6_AUTH_COPY.signed_out;
    const message = uc6State.authStatus === 'access_denied'
      ? copy[1]
      : 'Google 로그인 후 FetchDoc 관리자 권한이 확인되면 문서 검토 흐름이 표시됩니다.';
    card.append(createUc6Node('p', 'uc6-stage-copy', message));
    if (uc6State.authStatus === 'access_denied') card.append(createUc6Node('p', 'uc6-inline-error', uc6State.liveMessage || copy[1]));
    root.replaceChildren(card);
  }

  function createUC6FlowLaneSwitch() {
    const switcher = createUc6Node('div', 'uc6-flow-lane-switch');
    const upload = createUC6ActionButton('uc6-useUploadLaneBtn', '새 PPTX 등록', uc6State.flowLane === 'dummy_render' ? 'btn btn-primary' : 'btn btn-outline', uc6State.operationInFlight || Boolean(uc6State.jobId));
    const asset = createUC6ActionButton('uc6-useAssetLaneBtn', '게시된 Asset 사용', uc6State.flowLane === 'asset_render' ? 'btn btn-primary' : 'btn btn-outline', uc6State.operationInFlight || Boolean(uc6State.jobId));
    switcher.append(upload, asset);
    return switcher;
  }

  function renderUC6AssetSelectionStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card uc6-a8h-stage');
    card.append(createUc6Node('h2', '', '게시된 reusable Asset 선택'));
    card.append(createUc6Node('p', 'uc6-stage-copy', '이미 X-ray와 Advisory가 완료되어 게시된 원본 visual mold와 authoritative lineage를 선택합니다.'));
    card.append(createUC6FlowLaneSwitch());
    const catalog = uc6State.reusableAssetCatalog;
    if (!catalog) {
      card.append(createUc6Node('p', uc6State.reusableAssetCatalogStatus === 'error' ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.stageMessage || 'Asset 목록을 불러오는 중입니다.'));
      const actions = createUc6Node('div', 'uc6-action-row');
      actions.append(createUC6ActionButton('uc6-refreshAssetCatalogBtn', 'Asset 목록 새로고침', 'btn btn-outline', uc6State.operationInFlight));
      card.append(actions);
      root.replaceChildren(card);
      return;
    }
    if (!catalog.asset_count) {
      card.append(createUc6Node('p', 'uc6-inline-error', '현재 사용할 수 있는 게시 Asset이 없습니다.'));
      root.replaceChildren(card);
      return;
    }
    const grid = createUc6Node('div', 'uc6-a8h-asset-grid');
    catalog.assets.forEach((asset) => {
      const selected = asset.asset_id === uc6State.selectedAssetId;
      const item = createUc6Node('article', `uc6-a8h-asset-card${selected ? ' is-selected' : ''}`);
      item.dataset.uc6AssetId = asset.asset_id;
      const heading = createUc6Node('div', 'uc6-a8h-asset-heading');
      heading.append(createUc6Node('strong', '', `Published Asset · ${asset.slide_count} slides`));
      heading.append(createUc6Node('span', 'uc6-admin-chip is-ready', 'approved_for_reuse'));
      item.append(heading);
      item.append(createUc6Node('code', 'uc6-a8h-asset-id', asset.asset_id));
      const facts = createUc6Node('div', 'uc6-compact-facts');
      facts.append(createUC6SummaryItem('Generation units', asset.generation_unit_count));
      facts.append(createUC6SummaryItem('Slots', asset.slot_count));
      facts.append(createUC6SummaryItem('호환 패키지', asset.compatible_dummy_databag_package_count));
      item.append(facts);
      const button = createUC6ActionButton('', selected ? '선택됨' : '이 Asset 선택', selected ? 'btn btn-primary' : 'btn btn-outline', uc6State.operationInFlight);
      button.removeAttribute('id');
      button.dataset.uc6SelectAsset = asset.asset_id;
      item.append(button);
      grid.append(item);
    });
    card.append(grid);
    if (uc6State.stageMessage) card.append(createUc6Node('p', 'uc6-stage-message', uc6State.stageMessage));
    root.replaceChildren(card);
  }

  function renderUC6AssetPackageStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card uc6-a8h-stage');
    card.append(createUc6Node('h2', '', 'Asset Source Context 선택'));
    card.append(createUc6Node('p', 'uc6-stage-copy', '같은 게시 Asset에 curated/static 패키지를 적용하거나, 연결된 게시 Scenario Family에서 reusable source-data 상황 하나를 선택할 수 있습니다.'));
    const asset = uc6State.reusableAssetCatalog?.assets?.find((row) => row.asset_id === uc6State.selectedAssetId) || uc6State.assetPackageOptions?.asset;
    if (asset) {
      const banner = createUc6Node('div', 'uc6-a8h-selected-asset');
      banner.append(createUc6Node('strong', '', '선택된 reusable Asset'));
      banner.append(createUc6Node('code', 'uc6-a8h-asset-id', asset.asset_id));
      banner.append(createUC6ActionButton('uc6-changeAssetBtn', 'Asset 변경', 'btn btn-outline', uc6State.operationInFlight));
      card.append(banner);
    }

    const sourceChoices = createUc6Node('div', 'uc6-r6g-source-choices');
    const staticLane = createUc6Node('section', `uc6-r6g-source-lane${uc6State.assetSourceLane === 'static_package' ? ' is-selected' : ''}`);
    staticLane.append(createUc6Node('h3', '', 'A. Curated/static 데이터 패키지'));
    staticLane.append(createUc6Node('p', 'uc6-help-text', '기존 A8G 흐름입니다. 검증된 정적 databag을 선택해 문서를 렌더합니다.'));
    const options = uc6State.assetPackageOptions;
    if (!options) {
      staticLane.append(createUc6Node('p', 'uc6-stage-message', '호환 데이터 패키지를 불러오지 못했거나 아직 확인 중입니다.'));
      const actions = createUc6Node('div', 'uc6-action-row');
      actions.append(createUC6ActionButton('uc6-refreshAssetPackagesBtn', '패키지 다시 불러오기', 'btn btn-outline', uc6State.operationInFlight));
      staticLane.append(actions);
    } else {
      const grid = createUc6Node('div', 'uc6-package-grid');
      options.packages.forEach((pkg) => {
        const selected = uc6State.assetSourceLane === 'static_package' && uc6State.selectedPackageId === pkg.package_id && uc6State.selectedPackageVersion === pkg.package_version;
        const packageCard = createUc6Node('article', `uc6-package-card${selected ? ' is-selected' : ''}`);
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'uc6-asset-source-radio';
        radio.id = `uc6-a8h-pkg-${pkg.package_id}-${pkg.package_version}`;
        radio.checked = selected;
        radio.disabled = uc6State.operationInFlight;
        const label = document.createElement('label');
        label.htmlFor = radio.id;
        label.append(createUc6Node('strong', 'uc6-package-title', pkg.title));
        const header = createUc6Node('div', 'uc6-package-header');
        header.append(radio, label, createUc6Node('span', 'uc6-admin-chip is-neutral', pkg.package_version));
        packageCard.append(header, createUc6Node('p', 'uc6-package-desc', pkg.description));
        const meta = createUc6Node('div', 'uc6-package-meta');
        meta.append(createUc6Node('small', '', `Template family: ${pkg.template_family_id}`));
        meta.append(createUc6Node('small', '', `Canonical source groups: ${pkg.supported_canonical_source_group_count}`));
        packageCard.append(meta);
        packageCard.addEventListener('click', (event) => {
          if (uc6State.operationInFlight) return;
          if (event.target.tagName !== 'INPUT') radio.checked = true;
          uc6State.assetSourceLane = 'static_package';
          uc6State.selectedPackageId = pkg.package_id;
          uc6State.selectedPackageVersion = pkg.package_version;
          saveUC6LocalState();
          renderUC6All();
        });
        grid.append(packageCard);
      });
      staticLane.append(grid);
      const actions = createUc6Node('div', 'uc6-action-row');
      const canSubmit = uc6State.assetSourceLane === 'static_package' && Boolean(uc6State.selectedPackageId && uc6State.selectedPackageVersion && !uc6State.operationInFlight);
      actions.append(createUC6ActionButton('uc6-submitAssetRenderBtn', '정적 패키지로 PPTX/PDF 생성', 'btn btn-primary', !canSubmit));
      staticLane.append(actions);
    }

    const scenarioLane = createUc6Node('section', `uc6-r6g-source-lane${uc6State.assetSourceLane === 'published_scenario_family' ? ' is-selected' : ''}`);
    scenarioLane.append(createUc6Node('h3', '', 'B. 연결된 게시 Scenario Family'));
    scenarioLane.append(createUc6Node('p', 'uc6-help-text', '동일한 템플릿을 위한 세 가지 reusable source-data 상황입니다. 선택 후 Provider 생성과 결정론적 렌더가 새로 실행됩니다.'));
    const linked = uc6State.linkedScenarioFamily;
    if (uc6State.linkedScenarioFamilyStatus !== 'ready' || !linked) {
      const unavailable = uc6State.linkedScenarioFamilyStatus === 'unavailable';
      scenarioLane.append(createUc6Node('p', unavailable ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.linkedScenarioFamilyMessage || '연결된 Scenario Family를 불러오는 중입니다.'));
      const actions = createUc6Node('div', 'uc6-action-row');
      actions.append(createUC6ActionButton('uc6-refreshLinkedScenarioFamilyBtn', 'Scenario Family 다시 불러오기', 'btn btn-outline', uc6State.operationInFlight));
      scenarioLane.append(actions);
    } else {
      const familyMeta = createUc6Node('details', 'uc6-technical-details');
      familyMeta.append(createUc6Node('summary', '', 'Family 기술 정보'));
      const metaList = createUc6Node('ul', 'uc6-bounded-list');
      metaList.append(
        createUc6ListItem(`Published family: ${linked.linked_scenario_family.published_scenario_family_id}`),
        createUc6ListItem(`Original family: ${linked.linked_scenario_family.synthetic_scenario_family_id}`),
        createUc6ListItem(`Link identity: ${linked.linked_scenario_family.link_identity}`)
      );
      familyMeta.append(metaList);
      scenarioLane.append(familyMeta);
      const grid = createUc6Node('div', 'uc6-r6g-scenario-grid');
      linked.linked_scenario_family.scenarios.forEach((scenario) => {
        const selected = uc6State.assetSourceLane === 'published_scenario_family' && uc6State.selectedPublishedScenarioKey === scenario.scenario_key;
        const scenarioCard = createUc6Node('article', `uc6-package-card uc6-r6g-scenario-card${selected ? ' is-selected' : ''}`);
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'uc6-asset-source-radio';
        radio.id = `uc6-r6g-${scenario.scenario_key}`;
        radio.checked = selected;
        radio.disabled = uc6State.operationInFlight;
        const label = document.createElement('label');
        label.htmlFor = radio.id;
        label.append(createUc6Node('strong', 'uc6-package-title', scenario.label));
        const header = createUc6Node('div', 'uc6-package-header');
        header.append(radio, label, createUc6Node('code', 'uc6-r6g-scenario-key', scenario.scenario_key));
        scenarioCard.append(header);
        if (scenario.package_id) scenarioCard.append(createUc6Node('small', 'uc6-r6g-package-hint', `서버 연결 패키지: ${scenario.package_id}:${scenario.package_version}`));
        scenarioCard.addEventListener('click', (event) => {
          if (uc6State.operationInFlight) return;
          if (event.target.tagName !== 'INPUT') radio.checked = true;
          uc6State.assetSourceLane = 'published_scenario_family';
          uc6State.selectedPublishedScenarioFamilyId = linked.linked_scenario_family.published_scenario_family_id;
          uc6State.selectedPublishedScenarioKey = scenario.scenario_key;
          saveUC6LocalState();
          renderUC6All();
        });
        grid.append(scenarioCard);
      });
      scenarioLane.append(grid);
      const actions = createUc6Node('div', 'uc6-action-row');
      const canSubmit = uc6State.assetSourceLane === 'published_scenario_family'
        && linked.linked_scenario_family.scenarios.some((scenario) => scenario.scenario_key === uc6State.selectedPublishedScenarioKey)
        && !uc6State.operationInFlight;
      actions.append(createUC6ActionButton('uc6-submitPublishedScenarioRenderBtn', '선택한 시나리오로 새 문서 생성', 'btn btn-primary', !canSubmit));
      scenarioLane.append(actions);
    }
    sourceChoices.append(staticLane, scenarioLane);
    card.append(sourceChoices);
    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton('uc6-changeAssetBtn', 'Asset 변경', 'btn btn-outline', uc6State.operationInFlight));
    card.append(actions);
    if (uc6State.stageMessage) card.append(createUc6Node('p', 'uc6-stage-message', uc6State.stageMessage));
    root.replaceChildren(card);
  }

  function renderUC6AssetRenderResultStage(root) {
    const status = uc6State.renderStatus;
    if (!status || status.state !== 'render_completed' || status.review_state !== 'not_required' || status.publication_state !== 'not_applicable' || status.promotion_eligible !== false) {
      renderUC6UnavailableStage(root);
      return;
    }
    const isPublishedScenarioRender = uc6State.assetSourceLane === 'published_scenario_family';
    const card = createUc6Node('section', 'uc6-stage-card uc6-a8h-stage');
    card.append(createUc6Node('h2', '', isPublishedScenarioRender ? 'Scenario Family 문서 생성 완료' : 'Render-only 문서 생성 완료'));
    card.append(createUc6Node('p', 'uc6-stage-copy', isPublishedScenarioRender
      ? '게시된 source-context package를 바탕으로 Provider Slot 생성과 결정론적 물리 렌더를 완료했습니다. 이 consumer 결과는 재승인·재게시 대상이 아닙니다.'
      : '게시 Asset은 변경되지 않았습니다. 생성 결과는 일반 delivery이며 재승인·재게시 대상이 아닙니다.'));
    const summary = createUc6Node('div', 'uc6-compact-facts');
    summary.append(createUC6SummaryItem('Asset', status.asset.asset_id));
    if (isPublishedScenarioRender) {
      const scenarioKey = status.linked_scenario_family.scenario_key;
      const scenario = uc6State.linkedScenarioFamily?.linked_scenario_family?.scenarios?.find((option) => option.scenario_key === scenarioKey);
      summary.append(createUC6SummaryItem('선택 시나리오', scenario?.label || scenarioKey));
      summary.append(createUC6SummaryItem('Scenario key', scenarioKey));
      summary.append(createUC6SummaryItem('Bound package', `${status.bound_package.package_id}:${status.bound_package.package_version}`));
      summary.append(createUC6SummaryItem('Generation units', status.generation_unit_count));
      summary.append(createUC6SummaryItem('Slots', status.slot_count));
      summary.append(createUC6SummaryItem('Provider 생성', status.generated_slot_count));
      summary.append(createUC6SummaryItem('Grounded fallback', status.private_fallback_slot_count));
      summary.append(createUC6SummaryItem('Source batches', status.source_generation_batch_count));
      summary.append(createUC6SummaryItem('Provider calls', status.provider_call_count));
      summary.append(createUC6SummaryItem('완료 상태', status.render_state));
    } else {
      summary.append(createUC6SummaryItem('데이터 패키지', status.bound_package.title));
    }
    summary.append(createUC6SummaryItem('검토', status.review_state));
    summary.append(createUC6SummaryItem('게시', status.publication_state));
    card.append(summary);
    if (isPublishedScenarioRender && status.private_fallback_slot_count > 0) {
      card.append(createUc6Node('p', 'uc6-stage-message', `Source Context에서 사용할 수 없었던 ${status.private_fallback_slot_count}개 필드는 검증된 원본/템플릿 fallback을 유지했습니다. 생성은 정상 완료되었습니다.`));
    }
    const pdfCapability = uc6State.reviewArtifacts?.artifacts?.find((artifact) => artifact.alias === 'final_render_output_pdf');
    if (uc6State.reviewArtifactsStatus === 'ready' && pdfCapability?.actions?.view?.available) {
      const shell = createUc6Node('div', 'uc6-a8f-viewer-shell');
      const frame = document.createElement('iframe');
      frame.className = 'uc6-a8f-pdf-frame';
      frame.title = 'Render-only PDF 미리보기';
      frame.loading = 'eager';
      frame.referrerPolicy = 'no-referrer';
      frame.src = `/pdf-embed.html?file=${encodeURIComponent(pdfCapability.actions.view.href)}`;
      shell.append(frame);
      card.append(shell);
    } else {
      card.append(createUc6Node('p', uc6State.reviewArtifactsStatus === 'error' ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.reviewArtifactsMessage || '산출물 다운로드를 준비하고 있습니다.'));
    }
    const strip = createUc6Node('div', 'uc6-a8f-artifact-strip');
    for (const [key, label] of [['pdf', 'PDF'], ['pptx', 'PowerPoint']]) {
      const artifact = status.final_artifacts[key];
      const capability = uc6State.reviewArtifacts?.artifacts?.find((row) => row.alias === artifact.alias);
      const row = createUc6Node('article', 'uc6-a8f-artifact-row');
      const copy = createUc6Node('div', 'uc6-a8f-artifact-copy');
      copy.append(createUc6Node('strong', '', label));
      copy.append(createUc6Node('span', 'uc6-hash-display', `SHA-256: ${artifact.sha256}`));
      copy.append(createUc6Node('small', '', `크기: ${formatUc6Bytes(artifact.size_bytes)}`));
      row.append(copy);
      if (capability?.actions?.download?.available) {
        const button = createUC6ActionButton('', '다운로드', 'btn btn-outline', Boolean(uc6State.reviewArtifactDownloadActive));
        button.removeAttribute('id');
        button.dataset.uc6ArtifactDownload = artifact.alias;
        row.append(button);
      }
      strip.append(row);
    }
    card.append(strip);
    const downloadStatus = createUc6Node('p', 'uc6-stage-message', uc6State.reviewArtifactDownloadMessage || '');
    downloadStatus.id = 'uc6-reviewArtifactDownloadStatus';
    downloadStatus.hidden = !uc6State.reviewArtifactDownloadMessage;
    card.append(downloadStatus);
    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton('uc6-restartAssetRenderBtn', '같은 Asset으로 새 문서 생성', 'btn btn-primary', uc6State.operationInFlight));
    actions.append(createUC6ActionButton('uc6-clearBtn', '처음으로', 'btn btn-outline', uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function formatUC6SyntheticDifferentiationBasis(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    try { return JSON.stringify(value); } catch (_) { return ''; }
  }

  function renderUC6FreshSyntheticScenarioStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card uc6-fresh-synthetic-stage');
    card.append(createUc6Node('h2', '', '합성 샘플 컨텍스트 선택'));
    card.append(createUc6Node(
      'p',
      'uc6-stage-copy',
      '소스 PPTX 분석을 바탕으로 템플릿과 호환되는 세 가지 가상 샘플 컨텍스트를 생성합니다. 하나를 선택하면 샘플 문서 생성에 사용할 데이터가 고정됩니다. 실제 고객 정보가 아닙니다.'
    ));

    const isBound = uc6State.syntheticSelectionState === 'bound' && !!uc6State.boundSyntheticScenario;
    const isReady = uc6State.syntheticGenerationState === 'generation_ready' && uc6State.syntheticScenarioOptions.length === 3;
    if (!isReady) {
      const failed = uc6State.syntheticGenerationState === 'generation_failed';
      const ambiguous = uc6State.syntheticGenerationSubmissionAmbiguous;
      card.append(createUc6Node('p', failed || ambiguous ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.stageMessage || '합성 샘플 컨텍스트 상태를 확인하고 있습니다.'));
      const actions = createUc6Node('div', 'uc6-action-row');
      actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', '작업 상태 새로고침', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
      actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
      card.append(actions);
      root.replaceChildren(card);
      return;
    }

    if (isBound) {
      const bound = uc6State.boundSyntheticScenario;
      const boundPanel = createUc6Node('section', 'uc6-selection-layer uc6-bound-selection');
      boundPanel.append(createUc6Node('h3', 'uc6-selection-layer-title', '샘플 컨텍스트 선택 완료'));
      boundPanel.append(createUc6Node('strong', 'uc6-package-title', bound.label));
      boundPanel.append(createUc6Node('p', 'uc6-package-desc', bound.scenario_summary));
      const basis = formatUC6SyntheticDifferentiationBasis(bound.differentiation_basis);
      if (basis) boundPanel.append(createUc6Node('p', 'uc6-help-text', basis));
      card.append(boundPanel);
    }

    const grid = createUc6Node('div', 'uc6-package-grid uc6-synthetic-scenario-grid');
    uc6State.syntheticScenarioOptions.forEach((scenario) => {
      const selected = isBound && scenario.scenario_key === uc6State.boundSyntheticScenario.scenario_key;
      const scenarioCard = createUc6Node('article', `uc6-package-card uc6-synthetic-scenario-card${selected ? ' is-selected is-bound' : ''}`);
      scenarioCard.dataset.uc6SyntheticScenarioKey = scenario.scenario_key;
      const header = createUc6Node('div', 'uc6-package-header');
      header.append(createUc6Node('strong', 'uc6-package-title', scenario.label));
      if (selected) header.append(createUc6Node('span', 'uc6-admin-chip is-ready', '선택 완료'));
      scenarioCard.append(header, createUc6Node('p', 'uc6-package-desc', scenario.scenario_summary));
      const basis = formatUC6SyntheticDifferentiationBasis(scenario.differentiation_basis);
      if (basis) scenarioCard.append(createUc6Node('p', 'uc6-help-text', basis));
      const action = createUC6ActionButton(
        '',
        selected ? '선택 완료' : isBound ? '선택 불가' : uc6State.selectedSyntheticScenarioKey === scenario.scenario_key && uc6State.operationInFlight ? '선택 처리 중...' : '이 시나리오 선택',
        selected ? 'btn btn-primary' : 'btn btn-outline',
        isBound || uc6State.operationInFlight || uc6State.syntheticBindingSubmissionAmbiguous
      );
      action.removeAttribute('id');
      action.dataset.uc6SyntheticScenario = scenario.scenario_key;
      scenarioCard.append(action);
      grid.append(scenarioCard);
    });
    card.append(grid);
    card.append(createUc6Node(
      'p',
      uc6State.syntheticBindingSubmissionAmbiguous || uc6State.freshRenderSubmissionAmbiguous ? 'uc6-inline-error' : 'uc6-stage-message',
      uc6State.stageMessage || (isBound ? '선택이 서버에 고정되었습니다. 준비가 되면 샘플 문서 생성을 시작하세요.' : '정확히 하나의 합성 샘플 컨텍스트를 선택하세요.')
    ));
    const actions = createUc6Node('div', 'uc6-action-row');
    if (isBound) {
      const control = projectUc6FreshSyntheticRenderControl({
        selectionState: uc6State.syntheticSelectionState,
        boundScenario: uc6State.boundSyntheticScenario,
        publicState: uc6State.jobState,
        submitted: uc6State.freshRenderSubmitted,
        ambiguous: uc6State.freshRenderSubmissionAmbiguous,
        inFlight: uc6State.operationInFlight
      });
      const canSubmitFreshRender = isUc6Authorized() && control.canSubmit;
      actions.append(createUC6ActionButton(
        'uc6-submitFreshRenderBtn',
        uc6State.operationInFlight || uc6State.freshRenderSubmitted ? '샘플 문서 생성 요청 중...' : '샘플 문서 생성',
        'btn btn-primary',
        !canSubmitFreshRender
      ));
    }
    if (uc6State.syntheticBindingSubmissionAmbiguous) {
      actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', '선택 상태 새로고침', 'btn btn-outline', uc6State.operationInFlight));
    }
    if (uc6State.freshRenderSubmissionAmbiguous) {
      actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', '생성 접수 상태 다시 확인', 'btn btn-outline', uc6State.operationInFlight));
    }
    actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function renderUC6PackageStage(root) {
    if (uc6State.freshSyntheticExpected) {
      renderUC6FreshSyntheticScenarioStage(root);
      return;
    }
    const card = createUc6Node('section', 'uc6-stage-card');
    const onboardingInProgress = uc6State.jobState === 'source_ready' || uc6State.jobState === 'onboarding_queued' || uc6State.jobState === 'onboarding_running';
    card.append(createUc6Node('h2', '', onboardingInProgress && uc6State.freshOnboardingExpected ? 'Fresh onboarding · 데이터 준비' : 'Template Profile · 데이터 선택'));
    card.append(createUc6Node('p', 'uc6-stage-copy', onboardingInProgress && uc6State.freshOnboardingExpected
      ? 'Fresh same-job R1 topology를 준비하고 호환 데이터 그룹을 확인하고 있습니다.'
      : '확인된 Template Profile에 맞는 데이터 그룹과 시나리오를 순서대로 선택하세요.'));

    const options = uc6State.packageOptions;
    if (!options) {
      card.append(createUc6Node('p', 'uc6-stage-message', uc6State.stageMessage || 'Template Profile과 데이터 그룹을 확인하고 있습니다...'));
      const actions = createUc6Node('div', 'uc6-action-row');
      actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', uc6State.freshOnboardingExpected ? '작업 상태 새로고침' : '패키지 다시 불러오기', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
      actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
      card.append(actions);
      root.replaceChildren(card);
      return;
    }

    if (options.compatibility_state === 'incompatible_source_pptx') {
      card.append(createUc6Node('p', 'uc6-inline-error', '업로드한 PPTX와 호환되는 Template Profile 및 데이터 그룹을 확인할 수 없습니다.'));
      const actions = createUc6Node('div', 'uc6-action-row');
      actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
      card.append(actions);
      root.replaceChildren(card);
      return;
    }

    if (options.compatibility_state === 'fresh_onboarding_not_ready' || options.compatibility_state === 'fresh_onboarding_blocked') {
      card.append(createUc6Node('p', options.compatibility_state === 'fresh_onboarding_blocked' ? 'uc6-inline-error' : 'uc6-stage-message', options.compatibility_state === 'fresh_onboarding_blocked'
        ? 'Fresh onboarding이 차단되어 package family와 variant를 선택할 수 없습니다.'
        : 'Fresh onboarding이 완료될 때까지 package family와 variant 선택을 기다려 주세요.'));
      const actions = createUc6Node('div', 'uc6-action-row');
      actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', '작업 상태 새로고침', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
      actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
      card.append(actions);
      root.replaceChildren(card);
      return;
    }

    const isFresh = options.schema_version === UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA;
    const isBound = options.selection_state === 'bound';
    if (isBound) {
      uc6State.selectedPackageFamilyId = options.bound_package_family_id;
      uc6State.selectedPackageId = options.bound_package.package_id;
      uc6State.selectedPackageVersion = options.bound_package.package_version;
    }

    const profileLayer = createUc6Node('section', 'uc6-selection-layer uc6-template-profile-layer');
    profileLayer.append(createUc6Node('h3', 'uc6-selection-layer-title', '1. Template Profile'));
    const profileSummary = createUc6Node('div', 'uc6-template-profile-summary');
    const profile = options.template_profile;
    if (profile) {
      if (profile.profile_origin === 'fresh_same_job') {
        profileSummary.append(createUC6SummaryItem('Origin', 'Fresh same-job R1'));
        profileSummary.append(createUC6SummaryItem('Generation units', profile.generation_unit_count));
        profileSummary.append(createUC6SummaryItem('Fillable slots', profile.fillable_slot_count));
        profileSummary.append(createUC6SummaryItem('Required source groups', profile.required_authoritative_source_groups.join(', ') || '-'));
        profileSummary.append(createUC6SummaryItem('Supporting source groups', profile.supporting_source_groups.join(', ') || '-'));
        if (options.compatibility_metadata?.template_family_id) {
          profileSummary.append(createUC6SummaryItem('Compatibility template family', options.compatibility_metadata.template_family_id));
        }
      } else {
        profileSummary.append(createUC6SummaryItem('Profile ID', profile.profile_id));
        profileSummary.append(createUC6SummaryItem('Profile version', profile.profile_version));
        profileSummary.append(createUC6SummaryItem('Generation units', profile.generation_unit_count));
        profileSummary.append(createUC6SummaryItem('Fillable slots', profile.fillable_slot_count));
      }
    }
    profileLayer.append(profileSummary);
    card.append(profileLayer);

    const familyLayer = createUc6Node('section', 'uc6-selection-layer uc6-family-layer');
    familyLayer.append(createUc6Node('h3', 'uc6-selection-layer-title', '2. 데이터 그룹 / Package Family'));
    if (options.package_family_count === 0) {
      familyLayer.append(createUc6Node('p', 'uc6-stage-message', options.compatibility_state === 'no_compatible_packages'
        ? 'Fresh same-job R1 topology는 유효하지만 현재 호환되는 dummy-data 그룹이 없습니다.'
        : 'Template Profile은 확인되었지만 현재 선택 가능한 데이터 그룹이 없습니다.'));
    } else {
      const familyGrid = createUc6Node('div', 'uc6-package-family-grid');
      options.package_families.forEach((family) => {
        const familySelected = uc6State.selectedPackageFamilyId === family.package_family_id;
        const familyCard = createUc6Node('article', `uc6-package-family-card${familySelected ? ' is-selected' : ''}${isBound ? ' is-bound' : ''}`);
        const familyHeader = createUc6Node('div', 'uc6-package-header');
        const familyRadio = document.createElement('input');
        familyRadio.type = 'radio';
        familyRadio.name = 'uc6-package-family-radio';
        familyRadio.value = family.package_family_id;
        familyRadio.checked = familySelected;
        familyRadio.disabled = isBound || uc6State.operationInFlight;
        familyRadio.id = `uc6-family-${family.package_family_id}`;
        const familyLabel = document.createElement('label');
        familyLabel.htmlFor = familyRadio.id;
        familyLabel.className = 'uc6-package-title-label';
        familyLabel.append(createUc6Node('strong', 'uc6-package-title', family.title));
        familyHeader.append(familyRadio, familyLabel, createUc6Node('span', 'uc6-admin-chip is-neutral', `${family.variant_count} scenarios`));
        familyCard.append(familyHeader);
        if (family.description) familyCard.append(createUc6Node('p', 'uc6-package-desc', family.description));
        familyCard.addEventListener('click', (event) => {
          if (isBound || uc6State.operationInFlight) return;
          if (event.target.tagName !== 'INPUT') familyRadio.checked = true;
          uc6State.selectedPackageFamilyId = family.package_family_id;
          const packageStillBelongsToFamily = family.variants.some((variant) => (
            variant.package_id === uc6State.selectedPackageId
            && variant.package_version === uc6State.selectedPackageVersion
          ));
          if (!packageStillBelongsToFamily) {
            uc6State.selectedPackageId = '';
            uc6State.selectedPackageVersion = '';
          }
          saveUC6LocalState();
          renderUC6All();
        });
        familyGrid.append(familyCard);
      });
      familyLayer.append(familyGrid);
    }
    card.append(familyLayer);

    const selectedFamily = getSelectedUC6PackageFamily(options);
    const variantLayer = createUc6Node('section', 'uc6-selection-layer uc6-variant-layer');
    variantLayer.append(createUc6Node('h3', 'uc6-selection-layer-title', '3. 시나리오 / Package Variant'));
    if (!selectedFamily) {
      variantLayer.append(createUc6Node('p', 'uc6-help-text', options.package_family_count ? '데이터 그룹을 선택하면 해당 그룹의 시나리오가 표시됩니다.' : '선택 가능한 데이터 그룹이 준비되면 시나리오를 선택할 수 있습니다.'));
    } else {
      const variantGrid = createUc6Node('div', 'uc6-package-grid uc6-package-variant-grid');
      selectedFamily.variants.forEach((pkg) => {
        const isSelected = uc6State.selectedPackageId === pkg.package_id && uc6State.selectedPackageVersion === pkg.package_version;
        const packageCard = createUc6Node('article', `uc6-package-card${isSelected ? ' is-selected' : ''}${isBound ? ' is-bound' : ''}`);
        const header = createUc6Node('div', 'uc6-package-header');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'uc6-package-variant-radio';
        radio.value = `${pkg.package_id}:${pkg.package_version}`;
        radio.checked = isSelected;
        radio.disabled = isBound || uc6State.operationInFlight;
        radio.id = `uc6-pkg-${pkg.package_id}-${pkg.package_version}`;

        const titleLabel = document.createElement('label');
        titleLabel.htmlFor = radio.id;
        titleLabel.className = 'uc6-package-title-label';
        titleLabel.append(createUc6Node('strong', 'uc6-package-title', pkg.title));

        header.append(radio, titleLabel, createUc6Node('span', 'uc6-admin-chip is-neutral', pkg.package_version));
        packageCard.append(header);

        if (pkg.description) {
          packageCard.append(createUc6Node('p', 'uc6-package-desc', pkg.description));
        }

        const meta = createUc6Node('div', 'uc6-package-meta');
        meta.append(createUc6Node('small', '', `상태: ${pkg.status}`));
        meta.append(createUc6Node('small', '', `지원 그룹: ${pkg.supported_canonical_source_group_count}`));
        packageCard.append(meta);

        packageCard.addEventListener('click', (e) => {
          if (isBound || uc6State.operationInFlight) return;
          if (e.target.tagName !== 'INPUT') radio.checked = true;
          uc6State.selectedPackageId = pkg.package_id;
          uc6State.selectedPackageVersion = pkg.package_version;
          saveUC6LocalState();
          renderUC6All();
        });

        variantGrid.append(packageCard);
      });
      variantLayer.append(variantGrid);
    }
    card.append(variantLayer);

    if (isFresh) {
      card.append(createUc6Node('p', 'uc6-help-text', '선택 내용은 이 브라우저에만 저장됩니다. Fresh package binding과 문서 생성 연결은 R6E로 연기되었습니다.'));
    } else if (isBound) {
      card.append(createUc6Node('p', 'uc6-help-text uc6-bound-selection-message', '서버가 이 작업의 데이터 그룹과 시나리오를 고정했습니다. 로컬 선택으로 변경할 수 없습니다.'));
    } else {
      card.append(createUc6Node('p', 'uc6-help-text', '선택한 시나리오의 package_id와 package_version은 생성 요청 시 이 작업에 고정됩니다.'));
    }

    const actions = createUc6Node('div', 'uc6-action-row');
    const selectedVariant = getSelectedUC6PackageVariant(options);
    const canSubmit = !isFresh && isUc6Authorized()
      && uc6State.jobState === 'source_ready'
      && !!selectedFamily
      && !!selectedVariant
      && !uc6State.operationInFlight;
    const submitLabel = isBound ? '고정된 데이터로 문서 생성' : '선택한 데이터로 문서 생성';
    if (!isFresh) actions.append(createUC6ActionButton('uc6-submitRenderBtn', submitLabel, 'btn btn-primary', !canSubmit));
    actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));

    const indicator = createUc6Node('span', 'uc6-inline-status', '생성 요청 중...');
    indicator.id = 'uc6-renderIndicator';
    indicator.hidden = !uc6State.operationInFlight;
    actions.append(indicator);

    card.append(actions);

    if (uc6State.stageMessage) {
      card.append(createUc6Node('p', uc6State.stageMessage === UC6_GENERIC_PUBLIC_ERROR_MESSAGE ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.stageMessage));
    }

    root.replaceChildren(card);
  }

  function renderUC6RenderStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card');
    card.append(createUc6Node('h2', '', '문서 생성 진행 중'));
    card.append(createUc6Node('p', 'uc6-stage-copy', uc6State.flowLane === 'asset_render'
      ? uc6State.assetSourceLane === 'published_scenario_family'
        ? '게시 Scenario Family의 source context로 Provider Slot을 생성한 뒤 PPTX와 PDF를 렌더하고 있습니다.'
        : '게시 Asset의 원본 visual mold와 authoritative lineage에 선택한 databag을 적용하고 있습니다.'
      : uc6State.freshSyntheticExpected
        ? '서버에 고정된 합성 샘플 컨텍스트로 PPTX 및 PDF 산출물을 생성하고 있습니다.'
        : '선택한 데이터 패키지로 PPTX 및 PDF 산출물을 생성하고 있습니다.'));

    const facts = createUc6Node('div', 'uc6-compact-facts');
    if (uc6State.source?.filename) facts.append(createUC6SummaryItem('파일명', uc6State.source.filename));
    if (uc6State.assetSourceLane === 'published_scenario_family' && uc6State.selectedPublishedScenarioKey) {
      facts.append(createUC6SummaryItem('시나리오', uc6State.selectedPublishedScenarioKey));
    }
    if (uc6State.selectedPackageId) facts.append(createUC6SummaryItem('패키지 ID', uc6State.selectedPackageId));
    if (uc6State.selectedPackageVersion) facts.append(createUC6SummaryItem('패키지 버전', uc6State.selectedPackageVersion));
    facts.append(createUC6SummaryItem('상태', UC6_STATE_LABELS[uc6State.jobState] || uc6State.jobState));
    if (uc6State.lastPollingTimestamp) facts.append(createUC6SummaryItem('최근 확인', new Date(uc6State.lastPollingTimestamp).toLocaleTimeString('ko-KR')));
    card.append(facts);

    const progress = createUc6Node('div', 'uc6-progress');
    progress.append(createUc6Node('span', '', '진행'));
    card.append(progress);

    const chip = createUc6Node('span', 'uc6-admin-chip is-warning', '문서 생성 중');
    chip.id = 'uc6-pollingChip';
    card.append(chip);

    const message = createUc6Node('p', 'uc6-stage-message', uc6State.stageMessage || '서버에서 생성 작업이 처리 중입니다.');
    message.id = 'uc6-analysisMessage';
    card.append(message);

    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton('uc6-resumePollingBtn', '상태 새로고침', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
    card.append(actions);

    root.replaceChildren(card);
  }

  function renderUC6RenderUnknownStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card is-error');
    card.append(createUc6Node('h2', '', '생성 요청 상태 확인 필요'));
    card.append(createUc6Node('p', 'uc6-stage-copy', '생성 요청의 접수 여부를 확인할 수 없습니다.'));
    card.append(createUc6Node('p', 'uc6-inline-error', '네트워크 응답을 수신하지 못했습니다. 다시 생성을 요청하기 전에 반드시 작업 상태를 새로고침하여 서버 접수 여부를 확인하세요.'));

    const actions = createUc6Node('div', 'uc6-action-row');
    if (uc6State.flowLane === 'asset_render' && !uc6State.jobId) {
      actions.append(createUC6ActionButton('uc6-restartAssetRenderBtn', 'Asset 선택으로 돌아가기', 'btn btn-primary', uc6State.operationInFlight));
    } else {
      actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', '상태 새로고침', 'btn btn-primary', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
    }
    card.append(actions);

    root.replaceChildren(card);
  }

  function renderUC6RenderErrorStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card is-error');
    card.append(createUc6Node('h2', '', '문서 생성 실패'));
    card.append(createUc6Node('p', 'uc6-stage-copy', uc6State.freshSyntheticExpected
      ? '샘플 문서 생성 작업이 완료되지 않았습니다. 자동으로 다시 요청하지 않습니다.'
      : '문서 생성 작업이 실패했습니다.'));
    card.append(createUc6Node('p', 'uc6-inline-error', uc6State.stageMessage || (uc6State.freshSyntheticExpected
      ? '안전한 공개 오류 상태입니다. 상태를 다시 확인하거나 새 문서로 시작하세요.'
      : '생성 도중 오류가 발생했습니다. 재시도할 수 있습니다.')));

    const actions = createUc6Node('div', 'uc6-action-row');
    if (uc6State.flowLane === 'asset_render') {
      const hasSelection = uc6State.assetSourceLane === 'published_scenario_family'
        ? !!uc6State.selectedAssetId && !!uc6State.selectedPublishedScenarioFamilyId && !!uc6State.selectedPublishedScenarioKey && !!uc6State.linkedScenarioFamily
        : !!uc6State.selectedAssetId && !!uc6State.selectedPackageId && !!uc6State.selectedPackageVersion;
      actions.append(createUC6ActionButton('uc6-retryRenderBtn', '같은 Asset으로 다시 생성', 'btn btn-primary', !isUc6Authorized() || !hasSelection || uc6State.operationInFlight));
      actions.append(createUC6ActionButton('uc6-restartAssetRenderBtn', 'Asset 선택으로 돌아가기', 'btn btn-outline', uc6State.operationInFlight));
    } else if (uc6State.freshSyntheticExpected) {
      actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', '작업 상태 새로고침', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
      actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
    } else {
      const isBound = uc6State.packageOptions?.selection_state === 'bound'
        && !!uc6State.packageOptions?.bound_package_family_id
        && !!getSelectedUC6PackageVariant();
      if (isBound) {
        actions.append(createUC6ActionButton('uc6-retryRenderBtn', '다시 생성', 'btn btn-primary', !isUc6Authorized() || uc6State.operationInFlight));
      } else {
        actions.append(createUC6ActionButton('uc6-reconcileStatusBtn', '패키지 바인딩 확인', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
      }
      actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
    }
    card.append(actions);

    root.replaceChildren(card);
  }

  function createUC6A8FReviewPanel(renderStatus, publication, isPublished) {
    const panel = createUc6Node('aside', 'uc6-a8f-review-panel');
    panel.append(createUc6Node('h3', '', isPublished ? '게시 결과' : '관리자 승인'));
    const facts = createUc6Node('dl', 'uc6-a8f-review-facts');
    const factRows = [
      ['업로드 파일', uc6State.source?.filename || '-'],
      ['데이터 패키지', `${renderStatus.bound_package.package_id}:${renderStatus.bound_package.package_version}`],
      ['생성 상태', renderStatus.render_state],
      ['검토 상태', publication?.review_state || renderStatus.review_state],
      ['게시 상태', publication?.publication_state || renderStatus.publication_state]
    ];
    factRows.forEach(([label, value]) => facts.append(createUc6Node('dt', '', label), createUc6Node('dd', '', value)));
    panel.append(facts);

    if (isPublished) {
      const publishedAsset = publication.published_asset;
      const receipt = createUc6Node('div', 'uc6-a8f-publication-receipt');
      receipt.append(createUc6Node('strong', '', '재사용 자산 게시 완료'));
      receipt.append(createUc6Node('p', '', `Asset ID: ${publishedAsset.asset_id}`));
      receipt.append(createUc6Node('p', '', `승인 시각: ${publishedAsset.approved_at}`));
      receipt.append(createUc6Node('p', 'uc6-hash-display', `승인 receipt SHA-256: ${publishedAsset.approval_receipt_sha256}`));
      panel.append(receipt);
    } else {
      const confirmLabel = createUc6Node('label', 'uc6-a8f-confirm');
      const confirm = document.createElement('input');
      confirm.type = 'checkbox';
      confirm.id = 'uc6-publicationReviewConfirmed';
      confirm.checked = uc6State.publicationReviewConfirmed;
      confirm.disabled = uc6State.reviewArtifactsStatus !== 'ready' || uc6State.publicationRequestActive;
      confirmLabel.append(confirm, createUc6Node('span', '', 'PDF와 PPTX의 표시된 SHA-256을 기준으로 검토를 완료했습니다.'));
      panel.append(confirmLabel);

      const note = document.createElement('textarea');
      note.id = 'uc6-publicationNote';
      note.rows = 4;
      note.maxLength = 1000;
      note.value = uc6State.publicationNoteDraft;
      note.placeholder = '선택 사항 · 공개 가능한 관리자 검토 메모';
      note.disabled = uc6State.publicationRequestActive;
      panel.append(createUC6Field('관리자 메모', note));

      const canPublish = uc6State.reviewArtifactsStatus === 'ready'
        && uc6State.publicationStatus === 'ready'
        && publication?.publication_state === 'unpublished'
        && uc6State.publicationReviewConfirmed
        && !uc6State.publicationRequestActive;
      panel.append(createUC6ActionButton(
        'uc6-submitPublicationBtn',
        uc6State.publicationRequestActive ? '승인·게시 확인 중...' : '승인하고 게시',
        'btn btn-primary uc6-a8f-publish-button',
        !canPublish
      ));
    }

    const status = createUc6Node('p', `uc6-a8f-publication-message${uc6State.publicationStatus === 'error' ? ' is-error' : ''}`,
      uc6State.publicationMessage || uc6State.reviewArtifactsMessage || '검토 상태를 확인하고 있습니다.');
    panel.append(status);
    const secondary = createUc6Node('div', 'uc6-action-row');
    secondary.append(createUC6ActionButton('uc6-refreshReviewSurfaceBtn', '검토 상태 새로고침', 'btn btn-outline', uc6State.reviewSurfaceRequestActive || uc6State.publicationRequestActive));
    secondary.append(createUC6ActionButton('uc6-clearBtn', '새 문서 시작', 'btn btn-outline', uc6State.operationInFlight || uc6State.publicationRequestActive));
    panel.append(secondary);
    return panel;
  }

  function renderUC6A8FReviewSurfaceOnly() {
    const root = uc6Els.activeStageRoot;
    const renderStatus = uc6State.renderStatus;
    const card = root?.querySelector('.uc6-a8f-review-stage');
    const layout = card?.querySelector('.uc6-a8f-review-layout');
    const currentPanel = layout?.querySelector('.uc6-a8f-review-panel');
    if (!root || !renderStatus || !card || !layout || !currentPanel) {
      renderUC6All();
      return;
    }

    const publication = uc6State.publication;
    const isPublished = publication?.publication_state === 'published';
    const heading = card.querySelector('h2');
    const copy = card.querySelector('.uc6-stage-copy');
    if (heading) heading.textContent = isPublished ? '승인·게시 완료' : '문서 검토 및 승인';
    if (copy) {
      copy.textContent = isPublished
        ? '검토한 산출물이 재사용 가능한 자산으로 승인되고 게시되었습니다.'
        : '생성된 PDF를 확인하고, 동일한 PPTX/PDF SHA-256을 기준으로 명시적으로 승인·게시합니다.';
    }

    currentPanel.replaceWith(createUC6A8FReviewPanel(renderStatus, publication, isPublished));
    const stage = getUC6PresentationStage();
    renderUC6Stepper(stage);
    renderUC6ContextSummary();
    root.dataset.activeStage = stage;
    uc6State.lastRenderedStage = stage;
    if (uc6State.liveMessage) setUc6Text(uc6Els.liveStatus, uc6State.liveMessage, '');
  }

  function createUC6FreshPublicationPanel(renderStatus, publication) {
    const panel = createUc6Node('aside', 'uc6-a8f-review-panel uc6-r6f-b-publication-panel');
    const isPublished = publication?.publication_state === 'published';
    const hashMatch = Boolean(publication) && hasUC6PublicationArtifactParity(publication);
    panel.append(createUc6Node('h3', '', isPublished ? '재사용 게시 완료' : '관리자 검토 및 재사용 게시'));
    panel.append(createUc6Node('p', 'uc6-stage-copy', '승인하면 생성된 최종 PPTX가 아니라 원본 업로드 PPTX와 검증된 템플릿 지능이 재사용 Asset mold로 게시됩니다.'));

    const hashes = createUc6Node('dl', 'uc6-a8f-review-facts');
    const publicationPptx = publication?.publication_state === 'published'
      ? publication.published_asset?.reviewed_final_pptx_sha256
      : publication?.reviewed_final_pptx_sha256;
    const publicationPdf = publication?.publication_state === 'published'
      ? publication.published_asset?.reviewed_final_pdf_sha256
      : publication?.reviewed_final_pdf_sha256;
    for (const [label, value] of [
      ['검토 대상 PPTX SHA-256', publicationPptx || renderStatus.final_artifacts.pptx.sha256],
      ['검토 대상 PDF SHA-256', publicationPdf || renderStatus.final_artifacts.pdf.sha256]
    ]) hashes.append(createUc6Node('dt', '', label), createUc6Node('dd', 'uc6-hash-display', value));
    panel.append(hashes);

    const family = publication?.linked_scenario_family;
    if (family) {
      const familySection = createUc6Node('section', 'uc6-detail-group');
      familySection.append(createUc6Node('h3', '', '연결된 Scenario Family'));
      familySection.append(createUc6Node('p', '', '이번 검토에 선택한 하나뿐 아니라 검증된 합성 시나리오 3개 전체가 순서대로 연결되어 이후 재사용됩니다.'));
      const familyFacts = createUc6Node('dl', 'uc6-a8f-review-facts');
      const familyRows = [
        ['원본 Family ID', family.synthetic_scenario_family_id],
        ['시나리오 수', family.scenario_count],
        ['정렬된 시나리오', family.ordered_scenario_keys.join(' · ')],
        ['Family artifact SHA-256', family.scenario_family_artifact_sha256],
        ['게시 Family ID', family.published_scenario_family_id],
        ['게시 manifest SHA-256', family.publication_manifest_sha256],
        ['불변 연결 ID', family.link_identity]
      ].filter(([, value]) => hasUC6Value(value));
      familyRows.forEach(([label, value]) => familyFacts.append(
        createUc6Node('dt', '', label),
        createUc6Node('dd', label.includes('SHA-256') ? 'uc6-hash-display' : '', value)
      ));
      familySection.append(familyFacts);
      panel.append(familySection);
    }

    if (isPublished) {
      const asset = publication.published_asset;
      const receipt = createUc6Node('section', 'uc6-a8f-publication-receipt');
      receipt.append(createUc6Node('strong', '', 'Published Reusable Asset'));
      const rows = [
        ['Asset ID', asset.asset_id],
        ['원본 PPTX SHA-256', asset.source_pptx_sha256],
        ['Generation units', asset.generation_unit_count],
        ['Slots', asset.slot_count],
        ['Slides', asset.slide_count],
        ['Asset manifest SHA-256', asset.asset_manifest_sha256],
        ['Catalog entry SHA-256', asset.catalog_entry_sha256],
        ['Approval receipt SHA-256', asset.approval_receipt_sha256]
      ];
      const facts = createUc6Node('dl', 'uc6-a8f-review-facts');
      rows.forEach(([label, value]) => facts.append(
        createUc6Node('dt', '', label),
        createUc6Node('dd', label.includes('SHA-256') ? 'uc6-hash-display' : '', value)
      ));
      receipt.append(facts);
      panel.append(receipt);
    } else if (publication?.publication_state === 'unpublished' && hashMatch) {
      if (renderStatus.review_required) {
        panel.append(createUc6Node('p', 'uc6-stage-message', '근거 데이터 부족으로 원본 유지된 항목이 있으나, 백엔드 게시 준비 검증을 통과했으므로 관리자 검토 후 게시할 수 있습니다.'));
      }
      const confirmLabel = createUc6Node('label', 'uc6-a8f-confirm');
      const confirm = document.createElement('input');
      confirm.type = 'checkbox';
      confirm.id = 'uc6-publicationReviewConfirmed';
      confirm.checked = uc6State.publicationReviewConfirmed;
      confirm.disabled = uc6State.publicationStatus !== 'review_pending' || uc6State.publicationRequestActive;
      confirmLabel.append(confirm, createUc6Node('span', '', '표시된 최종 PPTX/PDF SHA-256과 전체 Scenario Family를 검토했습니다.'));
      panel.append(confirmLabel);

      const note = document.createElement('textarea');
      note.id = 'uc6-publicationNote';
      note.rows = 4;
      note.maxLength = 1000;
      note.value = uc6State.publicationNoteDraft;
      note.placeholder = '선택 사항 · 공개 가능한 관리자 검토 메모';
      note.disabled = uc6State.publicationRequestActive;
      panel.append(createUC6Field('관리자 메모', note));

      const canPublish = uc6State.publicationStatus === 'review_pending'
        && uc6State.publicationReviewConfirmed
        && !uc6State.publicationRequestActive;
      panel.append(createUC6ActionButton(
        'uc6-submitPublicationBtn',
        uc6State.publicationRequestActive ? '게시 확인 중...' : '검토 완료 및 재사용 Asset 게시',
        'btn btn-primary uc6-a8f-publish-button',
        !canPublish
      ));
    }

    const errorState = uc6State.publicationStatus === 'error' || uc6State.publicationStatus === 'reconciliation_required';
    panel.append(createUc6Node(
      'p',
      `uc6-a8f-publication-message${errorState ? ' is-error' : ''}`,
      uc6State.publicationMessage || '게시 준비 상태를 확인하고 있습니다.'
    ));
    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton(
      'uc6-refreshReviewSurfaceBtn',
      '게시 상태 새로고침',
      'btn btn-outline',
      uc6State.reviewSurfaceRequestActive || uc6State.publicationRequestActive
    ));
    panel.append(actions);
    return panel;
  }

  function renderUC6FreshPublicationSurfaceOnly() {
    const root = uc6Els.activeStageRoot;
    const currentPanel = root?.querySelector('.uc6-r6f-b-publication-panel');
    if (!root || !uc6State.renderStatus || !currentPanel) {
      renderUC6All();
      return;
    }
    currentPanel.replaceWith(createUC6FreshPublicationPanel(uc6State.renderStatus, uc6State.publication));
    if (uc6State.liveMessage) setUc6Text(uc6Els.liveStatus, uc6State.liveMessage, '');
  }

  function renderUC6FreshSyntheticRenderResultStage(root) {
    const status = uc6State.renderStatus;
    if (
      !status
      || status.state !== 'render_completed'
      || status.render_state !== 'render_completed'
      || !status.final_artifacts?.pptx
      || !status.final_artifacts?.pdf
    ) {
      renderUC6UnavailableStage(root);
      return;
    }

    const card = createUc6Node('section', 'uc6-stage-card uc6-r6e-d2-result-stage');
    card.append(createUc6Node('h2', '', '샘플 문서 생성 완료'));
    card.append(createUc6Node('p', 'uc6-stage-copy', '선택한 합성 샘플 컨텍스트로 생성된 최종 PPTX와 PDF가 준비되었습니다. 결과를 검토한 뒤 재사용 게시 여부를 명시적으로 결정하세요.'));

    const summary = createUc6Node('div', 'uc6-compact-facts');
    if (uc6State.boundSyntheticScenario?.label) summary.append(createUC6SummaryItem('샘플 컨텍스트', uc6State.boundSyntheticScenario.label));
    const generatedCount = status.disposition?.generated_count;
    const fallbackCount = status.disposition?.private_fallback_count;
    if (hasUC6Value(generatedCount)) summary.append(createUC6SummaryItem('생성', `${generatedCount}개`));
    if (hasUC6Value(fallbackCount)) summary.append(createUC6SummaryItem('원본 유지', `${fallbackCount}개`));
    card.append(summary);

    if (status.review_required) {
      card.append(createUc6Node('p', 'uc6-stage-message', '일부 항목은 근거 데이터가 부족하여 원본 템플릿 내용을 유지했습니다. 생성은 완료되었으며 결과 검토가 필요합니다.'));
    }

    const pdfCapability = uc6State.reviewArtifacts?.artifacts?.find((artifact) => artifact.alias === 'final_render_output_pdf');
    if (uc6State.reviewArtifactsStatus === 'ready' && pdfCapability?.actions?.view?.available) {
      const shell = createUc6Node('div', 'uc6-a8f-viewer-shell');
      const frame = document.createElement('iframe');
      frame.className = 'uc6-a8f-pdf-frame';
      frame.title = '생성된 샘플 문서 PDF 미리보기';
      frame.loading = 'eager';
      frame.referrerPolicy = 'no-referrer';
      frame.src = `/pdf-embed.html?file=${encodeURIComponent(pdfCapability.actions.view.href)}`;
      shell.append(frame);
      card.append(shell);
    } else {
      card.append(createUc6Node('p', uc6State.reviewArtifactsStatus === 'error' ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.reviewArtifactsMessage || '최종 산출물 접근 권한을 준비하고 있습니다.'));
    }

    const strip = createUc6Node('div', 'uc6-a8f-artifact-strip');
    for (const [key, label] of [['pdf', '최종 PDF'], ['pptx', '생성된 PPTX']]) {
      const artifact = status.final_artifacts[key];
      const capability = uc6State.reviewArtifacts?.artifacts?.find((row) => row.alias === artifact.alias);
      const row = createUc6Node('article', 'uc6-a8f-artifact-row');
      const copy = createUc6Node('div', 'uc6-a8f-artifact-copy');
      copy.append(createUc6Node('strong', '', label));
      copy.append(createUc6Node('span', 'uc6-hash-display', `SHA-256: ${artifact.sha256}`));
      copy.append(createUc6Node('small', '', `크기: ${formatUc6Bytes(artifact.size_bytes)}`));
      row.append(copy);
      if (capability?.actions?.download?.available) {
        const button = createUC6ActionButton('', `${label} 다운로드`, 'btn btn-outline', Boolean(uc6State.reviewArtifactDownloadActive));
        button.removeAttribute('id');
        button.dataset.uc6ArtifactDownload = artifact.alias;
        row.append(button);
      }
      strip.append(row);
    }
    card.append(strip);
    const downloadStatus = createUc6Node('p', 'uc6-stage-message', uc6State.reviewArtifactDownloadMessage || '');
    downloadStatus.id = 'uc6-reviewArtifactDownloadStatus';
    downloadStatus.hidden = !uc6State.reviewArtifactDownloadMessage;
    card.append(downloadStatus);
    card.append(createUC6FreshPublicationPanel(status, uc6State.publication));
    const actions = createUc6Node('div', 'uc6-action-row uc6-r6g-b1-final-actions');
    if (uc6State.reviewArtifactsStatus === 'error') {
      actions.append(createUC6ActionButton(
        'uc6-retryFreshDeliveryBtn',
        '결과 파일 접근 정보 다시 확인',
        'btn btn-outline',
        uc6State.operationInFlight
      ));
    }
    actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 시작', 'btn btn-primary', uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function renderUC6ResultStage(root) {
    if (uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected) {
      renderUC6FreshSyntheticRenderResultStage(root);
      return;
    }
    if (uc6State.flowLane === 'asset_render') {
      renderUC6AssetRenderResultStage(root);
      return;
    }
    const renderStatus = uc6State.renderStatus;
    if (
      !renderStatus
      || renderStatus.state !== 'render_completed'
      || renderStatus.render_state !== 'render_completed'
      || !renderStatus.bound_package
      || !renderStatus.final_artifacts?.pptx
      || !renderStatus.final_artifacts?.pdf
    ) {
      renderUC6UnavailableStage(root);
      return;
    }

    const publication = uc6State.publication;
    const isPublished = publication?.publication_state === 'published';
    const card = createUc6Node('section', 'uc6-stage-card uc6-a8f-review-stage');
    card.append(createUc6Node('h2', '', isPublished ? '승인·게시 완료' : '문서 검토 및 승인'));
    card.append(createUc6Node('p', 'uc6-stage-copy', isPublished
      ? '검토한 산출물이 재사용 가능한 자산으로 승인되고 게시되었습니다.'
      : '생성된 PDF를 확인하고, 동일한 PPTX/PDF SHA-256을 기준으로 명시적으로 승인·게시합니다.'));

    const layout = createUc6Node('div', 'uc6-a8f-review-layout');
    const viewerColumn = createUc6Node('section', 'uc6-a8f-viewer-column');
    viewerColumn.append(createUc6Node('h3', '', 'PDF 검토'));

    const pdfCapability = uc6State.reviewArtifacts?.artifacts?.find((artifact) => artifact.alias === 'final_render_output_pdf');
    const pptxCapability = uc6State.reviewArtifacts?.artifacts?.find((artifact) => artifact.alias === 'final_render_output_pptx');
    if (uc6State.reviewArtifactsStatus === 'ready' && pdfCapability?.actions?.view?.available) {
      const frameShell = createUc6Node('div', 'uc6-a8f-viewer-shell');
      const frame = document.createElement('iframe');
      frame.className = 'uc6-a8f-pdf-frame';
      frame.title = '생성된 PDF 관리자 검토 뷰어';
      frame.loading = 'eager';
      frame.referrerPolicy = 'no-referrer';
      frame.src = `/pdf-embed.html?file=${encodeURIComponent(pdfCapability.actions.view.href)}`;
      frameShell.append(frame);
      viewerColumn.append(frameShell);
    } else {
      const viewerState = createUc6Node('div', `uc6-a8f-viewer-state${uc6State.reviewArtifactsStatus === 'error' ? ' is-error' : ''}`);
      viewerState.append(createUc6Node('strong', '', uc6State.reviewArtifactsStatus === 'error' ? 'PDF 미리보기 준비 실패' : 'PDF 미리보기 준비 중'));
      viewerState.append(createUc6Node('p', '', uc6State.reviewArtifactsMessage || '검토용 capability를 확인하고 있습니다.'));
      viewerColumn.append(viewerState);
    }

    const artifacts = renderStatus.final_artifacts;
    const evidence = createUc6Node('div', 'uc6-a8f-artifact-strip');
    const appendArtifact = (label, artifact, capability) => {
      const item = createUc6Node('article', 'uc6-a8f-artifact-row');
      const copy = createUc6Node('div', 'uc6-a8f-artifact-copy');
      copy.append(createUc6Node('strong', '', label));
      copy.append(createUc6Node('span', 'uc6-hash-display', `SHA-256: ${artifact.sha256}`));
      copy.append(createUc6Node('small', '', `크기: ${formatUc6Bytes(artifact.size_bytes)}`));
      item.append(copy);
      if (capability?.actions?.download?.available) {
        const button = createUC6ActionButton('', '다운로드', 'btn btn-outline', Boolean(uc6State.reviewArtifactDownloadActive));
        button.removeAttribute('id');
        button.dataset.uc6ArtifactDownload = capability.alias;
        if (uc6State.reviewArtifactDownloadActive === capability.alias) button.textContent = '다운로드 준비 중...';
        item.append(button);
      }
      evidence.append(item);
    };
    appendArtifact('PDF', artifacts.pdf, pdfCapability);
    appendArtifact('PowerPoint', artifacts.pptx, pptxCapability);
    viewerColumn.append(evidence);
    const downloadStatus = createUc6Node('p', 'uc6-stage-message', uc6State.reviewArtifactDownloadMessage || '');
    downloadStatus.id = 'uc6-reviewArtifactDownloadStatus';
    downloadStatus.hidden = !uc6State.reviewArtifactDownloadMessage;
    downloadStatus.setAttribute('role', 'status');
    viewerColumn.append(downloadStatus);

    const panel = createUC6A8FReviewPanel(renderStatus, publication, isPublished);
    layout.append(viewerColumn, panel);
    card.append(layout);
    root.replaceChildren(card);
  }


  function renderUC6UnavailableStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card is-error');
    card.append(createUc6Node('h2', '', '상태 확인 필요'), createUc6Node('p', 'uc6-stage-copy', '알 수 없는 공개 상태입니다. 상태를 새로고침하거나 새 문서를 시작하세요.'));
    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton('uc6-resumePollingBtn', '상태 새로고침', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
    actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 시작', 'btn btn-outline', uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function renderUC6ActiveStage(stage) {
    const root = uc6Els.activeStageRoot;
    if (!root) return;
    const previous = uc6State.lastRenderedStage;
    if (stage === 'auth') renderUC6AuthStage(root);
    else if (stage === 'asset') renderUC6AssetSelectionStage(root);
    else if (stage === 'intake') renderUC6IntakeStage(root);
    else if (stage === 'package') {
      if (uc6State.flowLane === 'asset_render') renderUC6AssetPackageStage(root);
      else renderUC6PackageStage(root);
    }
    else if (stage === 'render') renderUC6RenderStage(root);
    else if (stage === 'render_unknown') renderUC6RenderUnknownStage(root);
    else if (stage === 'render_error') renderUC6RenderErrorStage(root);
    else if (stage === 'result' || stage === 'publication') renderUC6ResultStage(root);
    else if (stage === 'analysis') renderUC6AnalysisStage(root, false);
    else if (stage === 'analysis_error') renderUC6AnalysisStage(root, true);
    else if (stage === 'review') renderUC6ReviewStage(root);
    else if (stage === 'decision') renderUC6DecisionStage(root);
    else if (stage === 'complete') renderUC6CompleteStage(root);
    else renderUC6UnavailableStage(root);
    root.dataset.activeStage = stage;
    if (previous && previous !== stage) {
      queueMicrotask(() => {
        const title = root.querySelector('h2');
        if (title) title.tabIndex = -1;
        (title || root).focus({ preventScroll: true });
      });
    }
    uc6State.lastRenderedStage = stage;
  }

  function renderUC6ContextSummary() {
    const aside = uc6Els.contextSummary;
    if (!aside) return;
    const rows = [];
    if (uc6State.jobId) rows.push(['Job ID', uc6State.jobId]);
    if (uc6State.source?.filename) rows.push(['파일명', uc6State.source.filename]);
    if (hasUC6Value(uc6State.source?.slide_count)) rows.push(['슬라이드', uc6State.source.slide_count]);
    if (uc6State.jobState) rows.push(['현재 상태', UC6_STATE_LABELS[uc6State.jobState] || uc6State.jobState]);
    if (uc6State.flowLane === 'asset_render') {
      if (uc6State.selectedAssetId) rows.push(['Reusable Asset', uc6State.selectedAssetId]);
      if (uc6State.assetSourceLane === 'published_scenario_family') {
        const scenario = uc6State.linkedScenarioFamily?.linked_scenario_family?.scenarios?.find((option) => option.scenario_key === uc6State.selectedPublishedScenarioKey);
        rows.push(['Source Context', 'Linked Published Scenario Family']);
        if (uc6State.selectedPublishedScenarioFamilyId) rows.push(['Scenario Family', uc6State.selectedPublishedScenarioFamilyId]);
        if (uc6State.selectedPublishedScenarioKey) rows.push(['선택 시나리오', scenario?.label || uc6State.selectedPublishedScenarioKey]);
      }
      const packageTitle = uc6State.renderStatus?.bound_package?.title || (uc6State.assetSourceLane === 'static_package' ? uc6State.assetPackageOptions?.packages?.find((pkg) => pkg.package_id === uc6State.selectedPackageId && pkg.package_version === uc6State.selectedPackageVersion)?.title : '') || '';
      if (packageTitle) rows.push(['데이터 패키지', packageTitle]);
      if (uc6State.selectedPackageId) rows.push(['선택 패키지', `${uc6State.selectedPackageId}:${uc6State.selectedPackageVersion}`]);
      if (uc6State.renderStatus) {
        rows.push(['검토 상태', uc6State.renderStatus.review_state]);
        rows.push(['게시 상태', uc6State.renderStatus.publication_state]);
      }
    } else if (uc6State.flowLane === 'dummy_render') {
      if (uc6State.freshSyntheticExpected) {
        rows.push(['합성 샘플 상태', uc6State.syntheticSelectionState === 'bound' ? '선택 완료' : uc6State.syntheticGenerationState]);
        if (uc6State.boundSyntheticScenario) rows.push(['선택된 샘플 컨텍스트', uc6State.boundSyntheticScenario.label]);
      } else {
        const profile = uc6State.packageOptions?.template_profile;
        const family = getSelectedUC6PackageFamily();
        const variant = getSelectedUC6PackageVariant();
        if (profile?.profile_origin === 'fresh_same_job') {
          rows.push(['Template/Profile', `Fresh same-job R1 · ${profile.generation_unit_count} Generation Units · ${profile.fillable_slot_count} Slots`]);
        } else if (profile) {
          rows.push(['Template Profile', `${profile.profile_id}:${profile.profile_version}`]);
        }
        if (family) rows.push(['데이터 그룹', family.title || family.package_family_id]);
        const packageTitle = uc6State.renderStatus?.bound_package?.title || uc6State.packageOptions?.bound_package?.title || variant?.title || '';
        if (packageTitle) rows.push(['데이터 시나리오', packageTitle]);
        if (uc6State.selectedPackageId) rows.push(['선택 패키지', `${uc6State.selectedPackageId}:${uc6State.selectedPackageVersion}`]);
      }
      if (uc6State.renderStatus && !uc6State.freshSyntheticExpected) {
        rows.push(['검토 상태', uc6State.publication?.review_state || uc6State.renderStatus.review_state || 'review_pending']);
        rows.push(['게시 상태', uc6State.publication?.publication_state || uc6State.renderStatus.publication_state || 'unpublished']);
      } else if (uc6State.renderStatus?.review_required) {
        rows.push(['결과 상태', '생성 완료 · 검토 필요']);
      }
    } else {
      if (hasUC6Value(uc6State.review?.blocking_issue_count)) rows.push(['차단 항목', uc6State.review.blocking_issue_count]);
      if (hasUC6Value(uc6State.review?.warning_count)) rows.push(['경고', uc6State.review.warning_count]);
      if (uc6State.jobState === 'approved' && uc6State.finalDelivery) rows.push(['최종 산출물', `${uc6State.finalDelivery.readyCount}/${uc6State.finalDelivery.totalCount} 준비`]);
    }
    if (!rows.length) {
      aside.hidden = true;
      aside.replaceChildren();
      return;
    }
    aside.hidden = false;
    const card = createUc6Node('section', 'uc6-summary-card');
    card.append(createUc6Node('h2', '', '작업 요약'));
    const list = createUc6Node('dl', 'uc6-summary-list');
    rows.forEach(([label, value]) => list.append(createUc6Node('dt', '', label), createUc6Node('dd', '', uc6Text(value, ''))));
    card.append(list);
    aside.replaceChildren(card);
  }

  function renderUC6All() {
    if (!uc6Els.section) return;
    const stage = getUC6PresentationStage();
    renderUC6Session();
    renderUC6Stepper(stage);
    renderUC6ActiveStage(stage);
    renderUC6ContextSummary();
    if (uc6State.liveMessage) setUc6Text(uc6Els.liveStatus, uc6State.liveMessage, '');
  }

  function renderUC6IntakeStage(root) {
    if (uc6State.flowLane === 'asset_render') {
      renderUC6AssetSelectionStage(root);
      return;
    }
    const validation = getUC6SelectedFileValidation();
    const file = validation.ok ? validation.file : uc6State.selectedFile;
    const card = createUc6Node('section', 'uc6-stage-card');
    card.append(createUc6Node('h2', '', uc6State.jobId ? 'PPTX 등록 상태' : 'PPTX 등록'));
    card.append(createUc6Node('p', 'uc6-stage-copy', uc6State.jobId ? 'PPTX가 등록되었습니다. 적용할 데이터 패키지를 확인하세요.' : '새 PPTX를 등록하거나 이미 게시된 reusable Asset을 선택할 수 있습니다.'));
    if (!uc6State.jobId) card.append(createUC6FlowLaneSwitch());
    if (!uc6State.jobId) {
      const input = document.createElement('input');
      input.id = 'uc6-pptxFileInput';
      input.type = 'file';
      input.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
      const field = createUC6Field('PPTX 파일', input);
      field.classList.add('uc6-file-field');
      const selected = createUc6Node('small', '', file ? boundedFilename(file.name) : '선택된 파일 없음');
      selected.id = 'uc6-selectedFileName';
      field.append(selected);
      card.append(field, createUc6Node('p', 'uc6-help-text', '지원 형식: .pptx 파일 1개. 크기와 슬라이드 수는 서버가 확인합니다.'));
    } else if (uc6State.source) {
      const facts = createUc6Node('div', 'uc6-compact-facts');
      if (uc6State.source.filename) facts.append(createUC6SummaryItem('파일명', uc6State.source.filename));
      if (formatUc6Bytes(uc6State.source.size_bytes)) facts.append(createUC6SummaryItem('파일 크기', formatUc6Bytes(uc6State.source.size_bytes)));
      if (hasUC6Value(uc6State.source.slide_count)) facts.append(createUC6SummaryItem('슬라이드', uc6State.source.slide_count));
      if (facts.children.length) card.append(facts);
    }
    const actions = createUc6Node('div', 'uc6-action-row');
    if (!uc6State.jobId) actions.append(createUC6ActionButton('uc6-uploadBtn', 'PPTX 등록', 'btn btn-primary', !validation.ok || uc6State.operationInFlight));
    if (file || uc6State.jobId) actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 선택', 'btn btn-outline', uc6State.operationInFlight));
    const indicator = createUc6Node('span', 'uc6-inline-status', '처리 중...');
    indicator.id = 'uc6-uploadIndicator';
    indicator.hidden = !uc6State.operationInFlight;
    actions.append(indicator);
    card.append(actions);
    if (uc6State.stageMessage) card.append(createUc6Node('p', uc6State.stageMessage === UC6_GENERIC_PUBLIC_ERROR_MESSAGE ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.stageMessage));
    root.replaceChildren(card);
  }

  function renderUC6AnalysisStage(root, failed = false) {
    const card = createUc6Node('section', `uc6-stage-card${failed ? ' is-error' : ''}`);
    card.append(createUc6Node('h2', '', failed ? '분석 실패' : '분석 진행 중'));
    card.append(createUc6Node('p', 'uc6-stage-copy', failed ? '분석이 실패했습니다. 필요한 경우 명시적으로 다시 분석할 수 있습니다.' : '서버 분석 상태를 주기적으로 확인하고 있습니다.'));
    const facts = createUc6Node('div', 'uc6-compact-facts');
    if (uc6State.source?.filename) facts.append(createUC6SummaryItem('파일명', uc6State.source.filename));
    if (formatUc6Bytes(uc6State.source?.size_bytes)) facts.append(createUC6SummaryItem('파일 크기', formatUc6Bytes(uc6State.source.size_bytes)));
    if (hasUC6Value(uc6State.source?.slide_count)) facts.append(createUC6SummaryItem('슬라이드', uc6State.source.slide_count));
    facts.append(createUC6SummaryItem('상태', UC6_STATE_LABELS[uc6State.jobState] || '분석 상태 확인 중'));
    if (uc6State.lastPollingTimestamp) facts.append(createUC6SummaryItem('최근 확인', new Date(uc6State.lastPollingTimestamp).toLocaleTimeString('ko-KR')));
    card.append(facts);
    const progress = createUc6Node('div', failed ? 'uc6-progress is-error' : 'uc6-progress');
    progress.append(createUc6Node('span', '', failed ? '중단' : '진행'));
    card.append(progress);
    const chip = createUc6Node('span', failed ? 'uc6-admin-chip is-danger' : 'uc6-admin-chip is-warning', failed ? '재시도 가능' : '상태 확인 중');
    chip.id = 'uc6-pollingChip';
    card.append(chip);
    const message = createUc6Node('p', failed ? 'uc6-inline-error' : 'uc6-stage-message', uc6State.stageMessage || (failed ? '분석 실패 상태입니다. 명시적으로 재시도할 수 있습니다.' : '분석 상태를 확인하고 있습니다.'));
    message.id = 'uc6-analysisMessage';
    card.append(message);
    const actions = createUc6Node('div', 'uc6-action-row');
    if (failed) actions.append(createUC6ActionButton('uc6-retryAnalysisBtn', '다시 분석', 'btn btn-primary', !isUc6Authorized() || uc6State.operationInFlight));
    actions.append(createUC6ActionButton('uc6-resumePollingBtn', '상태 새로고침', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.operationInFlight));
    if (failed) actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 시작', 'btn btn-outline', uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function renderUC6ReviewStage(root) {
    const review = uc6State.review || {};
    const surface = review.public_review_surface || {};
    const issueProjection = projectUc6ReviewIssuePresentation(review);
    const card = createUc6Node('section', 'uc6-stage-card');
    card.append(createUc6Node('h2', '', '결과 검토'));
    const status = createUc6Node('p', 'uc6-stage-copy', uc6State.reviewMessage || '분석 결과의 준비 상태와 필요한 관리자 조치를 확인하세요.');
    status.id = 'uc6-reviewStatus';
    card.append(status);
    const summary = createUc6Node('div', 'uc6-review-summary');
    [
      ['준비 상태', review.global_readiness_status],
      ['차단 항목', review.blocking_issue_count],
      ['경고', review.warning_count],
      ['필요한 조치', surface.required_admin_action_count ?? surface.admin_action_count]
    ].filter((item) => hasUC6Value(item[1])).forEach(([label, value]) => summary.append(createUC6SummaryItem(label, value)));
    if (summary.children.length) card.append(summary);
    const issueOverview = renderUC6IssueOverview(issueProjection);
    if (issueOverview) card.append(issueOverview);
    const details = createUc6Node('div', 'uc6-review-details');
    appendUC6DetailSection(details, '검토 요약', [
      ...toUc6DisplayLines(surface.summary, ['status', 'message', 'summary']),
      ...toUc6DisplayLines(surface.next_recommended_phase, ['phase', 'message', 'summary']),
      ...toUc6DisplayLines(review.runtime_readiness_summary, ['status', 'ready', 'blocked', 'warning_count'])
    ]);
    appendUC6DetailSection(details, '관리자 조치', toUc6DisplayLines(surface.required_admin_actions, ['action', 'label', 'severity']));
    const techLines = [
      ...toUc6DisplayLines(surface.topology_audit_summary, ['status', 'message', 'summary']),
      ...toUc6DisplayLines(surface.dependency_cascade_summary, ['status', 'message', 'summary']),
      ...toUc6DisplayLines(surface.version_lock_summary, ['status', 'message', 'summary'])
    ];
    if (techLines.length || review.review_package_sha256) {
      const tech = createUc6Node('details', 'uc6-technical-details');
      tech.append(createUc6Node('summary', '', '기술 정보'));
      const list = createUc6Node('ul', 'uc6-bounded-list');
      const hash = typeof review.review_package_sha256 === 'string' && review.review_package_sha256.length >= 12 ? `review package: ${review.review_package_sha256.slice(0, 12)}...` : '';
      list.replaceChildren(...[...techLines, hash].filter(Boolean).slice(0, 8).map(createUc6ListItem));
      tech.append(list);
      details.append(tech);
    }
    if (details.children.length) card.append(details);
    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton('uc6-enterDecisionBtn', '처리 방향 결정', 'btn btn-primary', !mapUc6StateToView(uc6State.jobState).canDecide || uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function renderUC6IssueOverview(projection) {
    const blockers = projection?.blockers || {};
    const warnings = projection?.warnings || {};
    if (!blockers.totalCount && !warnings.totalCount) return null;
    const section = createUc6Node('section', 'uc6-issue-overview');
    if (blockers.totalCount > 0) {
      section.append(renderUC6IssueGroup({
        kind: 'blocker',
        group: blockers,
        open: true,
        copy: blockers.previewCount === 0
          ? `차단 항목 ${blockers.totalCount}건이 확인되었지만 대표 세부 정보를 안전하게 표시할 수 없습니다.`
          : blockers.omittedCount > 0
          ? `차단 항목 ${blockers.totalCount}건 중 대표 ${blockers.previewCount}건을 표시합니다.`
          : `차단 항목 ${blockers.totalCount}건이 확인되었습니다.`,
        summary: blockers.omittedCount > 0 ? `대표 차단 항목 ${blockers.previewCount}건 보기` : `차단 항목 ${blockers.previewCount}건 보기`
      }));
    }
    if (warnings.totalCount > 0) {
      section.append(renderUC6IssueGroup({
        kind: 'warning',
        group: warnings,
        open: warnings.totalCount <= 3,
        copy: warnings.previewCount === 0
          ? `경고 ${warnings.totalCount}건이 확인되었지만 대표 세부 정보를 안전하게 표시할 수 없습니다.`
          : warnings.omittedCount > 0
          ? `경고 ${warnings.totalCount}건이 확인되었습니다. 아래에는 대표 ${warnings.previewCount}건만 표시합니다.`
          : `경고 ${warnings.totalCount}건이 확인되었습니다.`,
        summary: warnings.omittedCount > 0 ? `대표 경고 ${warnings.previewCount}건 보기` : `경고 ${warnings.previewCount}건 보기`
      }));
    }
    return section;
  }

  function renderUC6IssueGroup({ kind, group, open, copy, summary }) {
    const section = createUc6Node('section', `uc6-issue-group is-${kind}`);
    section.append(createUc6Node('p', 'uc6-issue-summary', copy));
    if (!Array.isArray(group.items) || !group.items.length) {
      section.append(createUc6Node('p', 'uc6-help-text', '대표 항목 세부 정보를 안전하게 표시할 수 없습니다.'));
      return section;
    }
    const details = createUc6Node('details', `uc6-issue-disclosure is-${kind}`);
    details.open = open === true;
    details.append(createUc6Node('summary', '', summary));
    const list = createUc6Node('ul', 'uc6-issue-list');
    list.replaceChildren(...group.items.slice(0, 5).map(renderUC6IssueRow));
    details.append(list);
    section.append(details);
    return section;
  }

  function renderUC6IssueRow(item) {
    const row = createUc6Node('li', 'uc6-issue-row');
    row.append(createUc6Node('strong', 'uc6-issue-title', item.title));
    if (item.contextLabel && item.contextValue) {
      row.append(createUc6Node('span', 'uc6-issue-context', `${item.contextLabel}: ${item.contextValue}`));
    }
    const metaParts = [];
    if (item.reasonCode) metaParts.push(['reason', item.reasonCode]);
    if (item.technicalId) metaParts.push(['id', item.technicalId]);
    if (metaParts.length) {
      const meta = createUc6Node('span', 'uc6-issue-meta');
      metaParts.forEach(([label, value], index) => {
        if (index > 0) meta.append(document.createTextNode(' · '));
        meta.append(createUc6Node('span', '', `${label}: `), createUc6Node('code', '', value));
      });
      row.append(meta);
    }
    return row;
  }

  function renderUC6DecisionStage(root) {
    const mapped = mapUc6StateToView(uc6State.jobState);
    const disabled = !isUc6Authorized() || uc6State.operationInFlight || uc6State.decisionSubmitted || !mapped.canDecide;
    const decision = uc6State.decisionChoiceValue || 'approve';
    const card = createUc6Node('section', 'uc6-stage-card');
    card.append(createUc6Node('h2', '', '처리 방향 결정'), createUc6Node('p', 'uc6-stage-copy', '검토 결과에 대한 최종 처리 방향을 선택하고 필요한 메모를 입력하세요.'));
    const select = document.createElement('select');
    select.id = 'uc6-decisionChoice';
    select.disabled = disabled;
    [['approve', '승인'], ['request_revision', '수정 요청'], ['reject', '거절']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === decision;
      select.append(option);
    });
    card.append(createUC6Field('결정', select));
    const notes = document.createElement('textarea');
    notes.id = 'uc6-reviewNotes';
    notes.rows = 4;
    notes.disabled = disabled;
    notes.value = uc6State.reviewNotesDraft;
    notes.placeholder = decision === 'reject' ? '거절 사유를 한 줄에 하나씩 입력' : '필요한 검토 메모를 한 줄에 하나씩 입력';
    card.append(createUC6Field(decision === 'reject' ? '검토 메모(필수)' : '검토 메모', notes));
    if (decision === 'request_revision') {
      const revisions = document.createElement('textarea');
      revisions.id = 'uc6-requestedRevisions';
      revisions.rows = 4;
      revisions.disabled = disabled;
      revisions.value = uc6State.requestedRevisionsDraft;
      revisions.placeholder = '요청할 수정 사항을 한 줄에 하나씩 입력';
      card.append(createUC6Field('수정 요청 사항', revisions));
    }
    const status = createUc6Node('p', uc6State.decisionMessage ? 'uc6-stage-message' : 'uc6-help-text', uc6State.decisionMessage || '승인은 수정 요청 없이 제출됩니다. 수정 요청과 거절은 입력 조건을 확인합니다.');
    status.id = 'uc6-decisionStatus';
    card.append(status);
    const actions = createUc6Node('div', 'uc6-action-row uc6-decision-actions');
    actions.append(createUC6ActionButton('uc6-submitDecisionBtn', '결정 제출', 'btn btn-primary', disabled));
    actions.append(createUC6ActionButton('uc6-backToReviewBtn', '검토로 돌아가기', 'btn btn-outline', uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function renderUC6CompleteStage(root) {
    const card = createUc6Node('section', 'uc6-stage-card uc6-complete-stage');
    const decisionLabel = UC6_DECISION_LABELS[uc6State.decision?.decision] || UC6_STATE_LABELS[uc6State.jobState] || '결정 완료';
    card.append(createUc6Node('h2', '', '완료'), createUc6Node('p', 'uc6-stage-copy', `${decisionLabel} 상태로 관리자 검토가 마무리되었습니다.`));
    const lines = toUc6DisplayLines(uc6State.review?.current_decision_summary, ['decision', 'state', 'created', 'status']);
    if (lines.length) {
      const list = createUc6Node('ul', 'uc6-bounded-list');
      list.replaceChildren(...lines.map(createUc6ListItem));
      card.append(list);
    }
    if (uc6State.jobState === 'approved') card.append(renderUC6FinalDeliverySection());
    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton('uc6-clearBtn', '새 문서 시작', 'btn btn-primary', uc6State.operationInFlight));
    card.append(actions);
    root.replaceChildren(card);
  }

  function createUC6ArtifactAction(href, label, filename, options = {}) {
    const anchor = createUc6Node('a', 'btn btn-outline', label);
    anchor.href = href;
    if (options.openInNewTab) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    } else if (filename) {
      anchor.download = filename;
    }
    return anchor;
  }

  function renderUC6ArtifactCard(artifact) {
    const card = createUc6Node('article', 'uc6-artifact-card');
    const head = createUc6Node('div', 'uc6-artifact-head');
    head.append(createUc6Node('h4', '', artifact.label));
    const stateLabel = uc6State.finalDeliveryStatus === 'loading' && !uc6State.finalDelivery
      ? '상태 확인 중'
      : uc6State.finalDeliveryStatus === 'error'
        ? '상태 확인 실패'
        : artifact.ready
          ? '준비 완료'
          : '생성 대기 중';
    const state = createUc6Node('span', `uc6-artifact-state ${artifact.ready ? 'is-ready' : uc6State.finalDeliveryStatus === 'error' ? 'is-error' : 'is-waiting'}`, stateLabel);
    head.append(state);
    card.append(head);
    if (artifact.suggestedFilename) card.append(createUc6Node('p', 'uc6-artifact-filename', artifact.suggestedFilename));
    const actions = createUc6Node('div', 'uc6-artifact-actions');
    if (artifact.alias === 'final_render_output_pdf' && artifact.actions.view.available && artifact.actions.view.href) {
      actions.append(createUC6ArtifactAction(artifact.actions.view.href, 'PDF 보기', artifact.suggestedFilename, { openInNewTab: true }));
    }
    if (artifact.alias === 'final_render_output_pdf' && artifact.actions.download.available && artifact.actions.download.href) {
      actions.append(createUC6ArtifactAction(artifact.actions.download.href, 'PDF 다운로드', artifact.suggestedFilename));
    }
    if (artifact.alias === 'final_render_output_pptx' && artifact.actions.download.available && artifact.actions.download.href) {
      actions.append(createUC6ArtifactAction(artifact.actions.download.href, 'PPTX 다운로드', artifact.suggestedFilename));
    }
    if (actions.children.length) card.append(actions);
    return card;
  }

  function renderUC6FinalDeliverySection() {
    const section = createUc6Node('section', 'uc6-final-delivery');
    section.append(createUc6Node('h3', '', '최종 산출물'));
    const statusClass = uc6State.finalDeliveryStatus === 'error' ? 'uc6-inline-error' : 'uc6-stage-message';
    section.append(createUc6Node('p', statusClass, uc6State.finalDeliveryMessage || '최종 산출물 상태를 확인하고 있습니다.'));
    const fallbackArtifacts = [
      { alias: 'final_render_output_pdf', label: 'PDF', ready: false, suggestedFilename: '', actions: { view: { available: false, href: null }, download: { available: false, href: null } } },
      { alias: 'final_render_output_pptx', label: 'PowerPoint', ready: false, suggestedFilename: '', actions: { view: { available: false, href: null }, download: { available: false, href: null } } }
    ];
    const grid = createUc6Node('div', 'uc6-artifact-grid');
    const artifacts = uc6State.finalDelivery?.artifacts || fallbackArtifacts;
    grid.replaceChildren(...artifacts.map(renderUC6ArtifactCard));
    section.append(grid);
    const actions = createUc6Node('div', 'uc6-action-row');
    actions.append(createUC6ActionButton('uc6-refreshFinalDeliveryBtn', '산출물 상태 새로고침', 'btn btn-outline', !isUc6Authorized() || !uc6State.jobId || uc6State.finalDeliveryRequestActive));
    section.append(actions);
    return section;
  }



  function initUC6() {
    if (!uc6Els.section) return;
    setUc6AuthState('initializing');
    uc6Els.signInBtn?.addEventListener('click', signInUC6);
    uc6Els.signOutBtn?.addEventListener('click', signOutUC6);
    uc6Els.refreshSessionBtn?.addEventListener('click', refreshUC6Session);
    uc6Els.section.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!target) return;
      const reviewArtifactAlias = target.dataset.uc6ArtifactDownload || '';
      if (reviewArtifactAlias) downloadUC6ReviewArtifact(reviewArtifactAlias);
      else if (target.dataset.uc6SelectAsset) selectUC6ReusableAsset(target.dataset.uc6SelectAsset);
      else if (target.id === 'uc6-useUploadLaneBtn') switchUC6FlowLane('dummy_render');
      else if (target.id === 'uc6-useAssetLaneBtn') switchUC6FlowLane('asset_render');
      else if (target.id === 'uc6-refreshAssetCatalogBtn') loadUC6ReusableAssetCatalog();
      else if (target.id === 'uc6-refreshAssetPackagesBtn') loadUC6ReusableAssetPackages();
      else if (target.id === 'uc6-refreshLinkedScenarioFamilyBtn') loadUC6PublishedAssetLinkedScenarioFamily();
      else if (target.id === 'uc6-changeAssetBtn') {
        uc6State.selectedAssetId = '';
        uc6State.selectedPackageId = '';
        uc6State.selectedPackageVersion = '';
        uc6State.assetPackageOptions = null;
        uc6State.assetSourceLane = 'static_package';
        uc6State.linkedScenarioFamily = null;
        uc6State.linkedScenarioFamilyStatus = 'idle';
        uc6State.linkedScenarioFamilyMessage = '';
        uc6State.selectedPublishedScenarioFamilyId = '';
        uc6State.selectedPublishedScenarioKey = '';
        saveUC6LocalState();
        renderUC6All();
      }
      else if (target.id === 'uc6-submitAssetRenderBtn') submitUC6ReusableAssetRender();
      else if (target.id === 'uc6-submitPublishedScenarioRenderBtn') submitUC6PublishedAssetScenarioRender();
      else if (target.id === 'uc6-restartAssetRenderBtn') restartUC6AssetRenderSelection();
      else if (target.id === 'uc6-uploadBtn') uploadUC6PptxJob();
      else if (target.dataset.uc6SyntheticScenario) bindUC6FreshSyntheticScenario(target.dataset.uc6SyntheticScenario);
      else if (target.id === 'uc6-submitFreshRenderBtn') submitUC6FreshSyntheticRender();
      else if (target.id === 'uc6-retryFreshDeliveryBtn') {
        const controller = createUC6OperationController();
        loadUC6FreshRenderDeliveryState(controller.signal, { explicitRetry: true });
      }
      else if (target.id === 'uc6-submitRenderBtn') submitUC6DummyRender(false);
      else if (target.id === 'uc6-retryRenderBtn') {
        if (uc6State.flowLane === 'asset_render') {
          const sourceLane = uc6State.assetSourceLane;
          if (sourceLane === 'published_scenario_family') {
            restartUC6AssetRenderSelection();
            submitUC6PublishedAssetScenarioRender();
          } else {
            restartUC6AssetRenderSelection();
            submitUC6ReusableAssetRender();
          }
        } else {
          submitUC6DummyRender(true);
        }
      }
      else if (target.id === 'uc6-reconcileStatusBtn') refreshUC6JobStatus();
      else if (target.id === 'uc6-refreshReviewSurfaceBtn') {
        if (uc6State.reviewSurfaceAbortController) uc6State.reviewSurfaceAbortController.abort();
        uc6State.reviewSurfaceAbortController = new AbortController();
        if (uc6State.flowLane === 'dummy_render' && uc6State.freshSyntheticExpected) {
          loadUC6FreshPublicationState(uc6State.reviewSurfaceAbortController.signal, { explicitRefresh: true });
        } else {
          clearUC6A8FReviewState({ keepDecisionIdentity: true });
          loadUC6A8FReviewState(uc6State.reviewSurfaceAbortController.signal);
        }
      } else if (target.id === 'uc6-submitPublicationBtn') submitUC6ReusableAssetPublication();
      else if (target.id === 'uc6-clearBtn') resetUC6JobState(true);
      else if (target.id === 'uc6-retryAnalysisBtn') submitUC6Analysis(true);
      else if (target.id === 'uc6-resumePollingBtn') {
        uc6State.consecutivePollErrors = 0;
        startUC6Polling();
        renderUC6All();
      } else if (target.id === 'uc6-enterDecisionBtn') {
        uc6State.decisionMode = true;
        uc6State.decisionMessage = '';
        renderUC6All();
      } else if (target.id === 'uc6-backToReviewBtn') {
        uc6State.decisionMode = false;
        renderUC6All();
      } else if (target.id === 'uc6-submitDecisionBtn') {
        submitUC6Decision();
      } else if (target.id === 'uc6-refreshFinalDeliveryBtn') {
        if (uc6State.finalDeliveryAbortController) uc6State.finalDeliveryAbortController.abort();
        uc6State.finalDeliveryAbortController = new AbortController();
        fetchUC6FinalDeliveryCapabilities(uc6State.finalDeliveryAbortController.signal);
      }
    });
    uc6Els.section.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.id === 'uc6-pptxFileInput') {
        const validation = validateUc6PptxSelection(target.files);
        uc6State.selectedFile = validation.ok ? validation.file : null;
        uc6State.stageMessage = validation.ok ? '업로드 준비가 완료되었습니다.' : validation.message;
        setUC6LiveMessage(uc6State.stageMessage);
        renderUC6All();
      } else if (target.id === 'uc6-publicationReviewConfirmed') {
        uc6State.publicationReviewConfirmed = target.checked === true;
        uc6State.publicationMessage = uc6State.publicationReviewConfirmed
          ? '검토 확인이 기록되었습니다. 승인·게시를 실행할 수 있습니다.'
          : 'PDF와 PPTX 검토 완료를 확인하세요.';
        renderUC6PublicationSurfaceOnly();
      } else if (target.id === 'uc6-decisionChoice') {
        uc6State.decisionChoiceValue = target.value;
        if (target.value !== 'request_revision') uc6State.requestedRevisionsDraft = '';
        uc6State.decisionMessage = '';
        renderUC6All();
      }
    });
    uc6Els.section.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.id === 'uc6-reviewNotes') uc6State.reviewNotesDraft = target.value;
      if (target.id === 'uc6-requestedRevisions') uc6State.requestedRevisionsDraft = target.value;
      if (target.id === 'uc6-publicationNote') uc6State.publicationNoteDraft = target.value.slice(0, 1000);
    });
    window.addEventListener('beforeunload', () => {
      stopUC6Polling();
      abortUC6Operations();
    });
    initUC6FirebaseAuth();
    renderUC6All();
  }

  initUC6();

  // Keyboard Left/Right Navigation Hook for UC5 V2.1
  window.addEventListener('keydown', (e) => {
    // Only trigger if #view-uc5 is active and we have slides data loaded
    const uc5Section = document.getElementById('view-uc5');
    if (uc5Section && uc5Section.classList.contains('active') && (uc5SlidesData || uc5RenderPlanData)) {
      // Ignore if user is currently typing in an input or textarea
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (uc5RenderPlanData) {
        const screenCount = getUC5RenderPlanScreenCount();
        if (e.key === 'ArrowLeft' && uc5RenderPlanScreenIndex > 0) {
          uc5RenderPlanScreenIndex--;
          renderUC5V2CurrentScreen();
        } else if (e.key === 'ArrowRight') {
          if (uc5RenderPlanScreenIndex < screenCount - 1) {
            uc5RenderPlanScreenIndex++;
            renderUC5V2CurrentScreen();
          } else {
            triggerConfetti();
          }
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (uc5ActivePageIndex > 1) {
          uc5ActivePageIndex--;
          renderUC5Slide();
        }
      } else if (e.key === 'ArrowRight') {
        if (uc5ActivePageIndex < 5) {
          uc5ActivePageIndex++;
          renderUC5Slide();
        } else if (uc5ActivePageIndex === 5) {
          triggerConfetti();
          alert('🎉 축하합니다! 임직원 교육 과정을 성공적으로 이수하셨습니다.');
        }
      }
    }
  });
});
