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
  UC4_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/text-to-sql-webapp',
  UC5_W01_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-ai-narrative-plan',
  UC5_W02_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-template-blueprint-plan',
  UC5_W03_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/uc5-slot-fill-render',
  UC6_RUNTIME_DATABAG_PREP_WEBHOOK: 'https://peter-n8n.duckdns.org/webhook/fetchdoc/runtime-databag-prep/mvp'
};

// ==========================================
// 🏷️ 앱 버전 표시 (배포/캐시 확인용)
// ==========================================
const APP_VERSION = 'app.uc5-r2-2h-strict-canonical-frontend-bundle-2026-06-17-v1';
console.log(APP_VERSION);
console.info('[UC5 R2-2H] strict canonical frontend contract patch active');

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

  const UC5_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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

  function setUC5LoadingCopy(stage) {
    if (!uc5LoadingText || !uc5LoadingSubtext) return;

    const copies = {
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

  function buildUC5PlanningFormData() {
    if (!uc5UploadedFile) {
      throw new Error('교육 원문 PDF를 먼저 업로드해 주세요.');
    }

    const planningContext = getUC5PlanningContext();
    const fileProfile = getUC5FileProfile(uc5UploadedFile);
    const selectedMacroShell = planningContext.preferred_macro_shell_id || 'auto';
    const templateId = selectedMacroShell === 'auto'
      ? 'auto'
      : (UC5_MACRO_SHELL_META[selectedMacroShell] || UC5_MACRO_SHELL_META.auto).templateId || 'auto';

    const formData = new FormData();
    formData.append('request_type', 'uc5_ai_narrative_planning');
    formData.append('workflow_version', 'uc5_v2');
    formData.append('workflow_stage', 'ai_narrative_planning');
    formData.append('workflow_mode', 'ai_narrative_planning');
    formData.append('narrative_choice', selectedMacroShell === 'auto' ? 'ai_recommend' : selectedMacroShell);
    formData.append('planning_input_mode', 'ai_recommend_then_review');
    formData.append('template_id', templateId);
    formData.append('macro_shell_id', selectedMacroShell);
    formData.append('file_name', fileProfile.file_name);
    formData.append('file_type', fileProfile.file_type || 'application/pdf');
    formData.append('file_size_bytes', String(fileProfile.file_size_bytes || 0));
    formData.append('planning_context', JSON.stringify(planningContext));
    formData.append('file_profile', JSON.stringify(fileProfile));
    formData.append('file', uc5UploadedFile);

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

    if (file.size > UC5_MAX_FILE_SIZE_BYTES) {
      alert('파일 크기는 최대 10MB까지 업로드 가능합니다.');
      return;
    }

    uc5UploadedFile = file;

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
    const fileProfile = getUC5FileProfile(uc5UploadedFile);
    const templateRegistryBundle = await buildUC5TemplateRegistryBundle(currentUiSelection);

    const formData = new FormData();
    formData.append('request_type', 'uc5_template_bound_blueprint_planning');
    formData.append('workflow_version', 'uc5_v2');
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
    formData.append('file', uc5UploadedFile);

    return formData;
  }

  async function buildUC5SlotPayloadSeedFormData() {
    if (!uc5TemplateBoundBlueprintData) {
      throw new Error('화면 구성 설계 결과가 없습니다. 먼저 기획안을 승인해 주세요.');
    }

    if (!uc5UploadedFile) {
      throw new Error('학습 내용 작성에 사용할 원본 PDF가 없습니다. 파일을 다시 업로드해 주세요.');
    }

    const currentUiSelection = uc5TemplateBoundBlueprintData.current_ui_selection || uc5CurrentUiSelectionData || {};
    const fileProfile = getUC5FileProfile(uc5UploadedFile);
    const payloadPolicyBundle = await buildUC5PayloadPolicyBundle(uc5TemplateBoundBlueprintData);

    const formData = new FormData();
    formData.append('request_type', 'uc5_slot_payload_seed_composition');
    formData.append('workflow_version', 'uc5_v2');
    formData.append('workflow_stage', 'slot_payload_seed_composition');
    formData.append('workflow_mode', 'slot_payload_seed_composition');
    formData.append('template_id', currentUiSelection.template_id || '');
    formData.append('macro_shell_id', currentUiSelection.macro_shell_id || '');
    formData.append('screen_count', String(currentUiSelection.screen_count || ''));
    formData.append('registry_version', UC5_EXPECTED_COMPONENT_REGISTRY_VERSION);
    formData.append('payload_policy_bundle', JSON.stringify(payloadPolicyBundle));
    console.info('[UC5 R2-2H] W03 payload_policy_bundle attached', {
      template_id: payloadPolicyBundle.template_id || '',
      macro_shell_id: payloadPolicyBundle.macro_shell_id || '',
      selected_component_count: payloadPolicyBundle.selected_component_count || 0
    });
    formData.append('file_name', fileProfile.file_name);
    formData.append('file_type', fileProfile.file_type || 'application/pdf');
    formData.append('file_size_bytes', String(fileProfile.file_size_bytes || 0));
    formData.append('template_bound_blueprint', JSON.stringify(uc5TemplateBoundBlueprintData));
    formData.append('current_ui_selection', JSON.stringify(currentUiSelection));
    formData.append('file_profile', JSON.stringify(fileProfile));
    formData.append('file', uc5UploadedFile);

    return formData;
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

    if (!slotPayloadSeed || slotPayloadSeed.slot_payload_seed_version !== 'uc5_slot_payload_seed.v1') {
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

  function renderUC5RenderPlan(data) {
    uc5PlanningDraftData = null;
    uc5SlidesData = null;
    uc5RenderPlanData = normalizeUC5RenderPlan(data);
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};

    if (confettiTimer) {
      cancelAnimationFrame(confettiTimer);
      confettiTimer = null;
    }

    renderUC5V2CurrentScreen();
  }


  function renderUC5TemplateBlueprintPreview(blueprint) {
    uc5TemplateBoundBlueprintData = blueprint;
    uc5SlotPayloadSeedData = null;
    uc5SourceCoverageSummaryData = null;
    uc5RenderPlanData = null;
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

      const payloadFormData = await buildUC5SlotPayloadSeedFormData();
      const payloadResponse = await postUC5Workflow(
        CONFIG.UC5_W03_WEBHOOK,
        payloadFormData,
        '학습 내용 작성 실패'
      );

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
      renderUC5RenderPlan(renderPlan);
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
    uc5RenderPlanScreenIndex = 0;
    uc5RenderPlanInteractionState = {};

    try {
      const data = await postUC5Workflow(
        CONFIG.UC5_W01_WEBHOOK,
        buildUC5PlanningFormData(),
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
        if (uc5RenderPlanData && uc5RenderPlanScreenIndex > 0) {
          uc5RenderPlanScreenIndex--;
          renderUC5V2CurrentScreen();
        }
        return;
      }

      const uc5V2NextBtn = e.target.closest('.uc5-v2-next-btn');
      if (uc5V2NextBtn) {
        if (uc5RenderPlanData) {
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
  // 🧾 Use Case 6: FetchDoc 문서 생성 운영 관리
  // ==========================================
  const UC6_DEFAULT_BATCH_ID = 'fd_norm_n8n_7f18_lookup_20260606_055620';

  const UC6_SAMPLE_CASES = {
    acme_runtime_proposal: {
      label: 'Acme 제안서 샘플',
      description: 'B1 happy-path smoke와 같은 4개 필수 slot 중심 샘플입니다.',
      runtime_context: {
        account_name: 'Acme Corp',
        proposal_date: '2026-06-16',
        vendor_contact: 'Peter Kim',
        vendor_name: 'FetchDoc Runtime'
      }
    },
    lg_internal_demo: {
      label: 'LG 내부 보고서 샘플',
      description: '내부 문서 생성 승인 흐름을 시뮬레이션하는 샘플입니다.',
      runtime_context: {
        account_name: 'LG Electronics',
        proposal_date: '2026-06-17',
        vendor_contact: 'AI Transformation Team',
        vendor_name: 'FetchDoc Admin'
      }
    },
    partner_proposal_demo: {
      label: '파트너 제안 샘플',
      description: '파트너사 대상 문서 생성 조건을 확인하는 샘플입니다.',
      runtime_context: {
        account_name: 'Global Partner Co.',
        proposal_date: '2026-06-20',
        vendor_contact: 'Partner Success Manager',
        vendor_name: 'FetchDoc Partner Desk'
      }
    }
  };

  const UC6_STAGE_MODEL = [
    { id: 'pptx_upload', label: 'PPTX 업로드', detail: '완성본 PPTX 선택', baseState: 'active' },
    { id: 'template_analysis', label: '템플릿 분석', detail: '슬라이드·레이아웃 추출', baseState: 'idle' },
    { id: 'template_approval', label: '템플릿 승인', detail: '관리자 Gate', baseState: 'idle' },
    { id: 'slot_contract', label: 'Slot 구성', detail: '필수 Slot 확인', baseState: 'idle' },
    { id: 'runtime_context', label: 'Runtime Context', detail: '샘플 입력값', baseState: 'active' },
    { id: 'databag_prep', label: 'Databag Prep', detail: 'B1 webhook', baseState: 'idle' },
    { id: 'render_bridge', label: 'Render Bridge', detail: '후속 연결', baseState: 'locked' },
    { id: 'pdf_preview', label: 'PDF Preview', detail: '후속 연결', baseState: 'locked' },
    { id: 'download', label: 'Download', detail: '후속 연결', baseState: 'locked' }
  ];

  const UC6_DEFAULT_ARTIFACTS = {
    runtime_context_request: 'runtime_context_request.json',
    runtime_source_collection_plan: 'runtime_source_collection_plan.json',
    runtime_source_collection_status: 'runtime_source_collection_status.json',
    runtime_databag_candidate: 'runtime_databag_candidate.json',
    runtime_databag_readiness_result: 'runtime_databag_readiness_result.json',
    runtime_databag_readiness_report: 'runtime_databag_readiness_report.md'
  };

  const uc6State = {
    selectedSampleId: 'acme_runtime_proposal',
    selectedBatchId: UC6_DEFAULT_BATCH_ID,
    approvalStatus: 'pending',
    pptxFileName: '',
    requestPayload: null,
    responsePayload: null,
    isRunning: false,
    lastError: null,
    activeTab: 'template'
  };

  const uc6Els = {
    section: document.getElementById('view-uc6'),
    heroStatusText: document.getElementById('uc6-heroStatusText'),
    heroStatusSubtext: document.getElementById('uc6-heroStatusSubtext'),
    pptxInput: document.getElementById('uc6-pptxInput'),
    pptxUploadText: document.getElementById('uc6-pptxUploadText'),
    pptxFileName: document.getElementById('uc6-pptxFileName'),
    pptxStateChip: document.getElementById('uc6-pptxStateChip'),
    batchSelect: document.getElementById('uc6-batchSelect'),
    customBatchId: document.getElementById('uc6-customBatchId'),
    approvalChip: document.getElementById('uc6-templateApprovalChip'),
    gateButtons: document.querySelectorAll('[data-uc6-approval]'),
    sampleCase: document.getElementById('uc6-sampleCase'),
    runtimeEditor: document.getElementById('uc6-runtimeContextEditor'),
    contextStateChip: document.getElementById('uc6-contextStateChip'),
    runBtn: document.getElementById('uc6-runBtn'),
    resetBtn: document.getElementById('uc6-resetBtn'),
    actionHelper: document.getElementById('uc6-actionHelper'),
    miniPipeline: document.getElementById('uc6-miniPipeline'),
    stageTimeline: document.getElementById('uc6-stageTimeline'),
    tabs: document.querySelectorAll('[data-uc6-tab]'),
    templateSummary: document.getElementById('uc6-templateSummary'),
    slotTableBody: document.getElementById('uc6-slotTableBody'),
    readinessSummary: document.getElementById('uc6-readinessSummary'),
    artifactTableBody: document.getElementById('uc6-artifactTableBody'),
    debugJson: document.getElementById('uc6-debugJson'),
    runtimeContextPreview: document.getElementById('uc6-runtimeContextPreview'),
    previewStateChip: document.getElementById('uc6-previewStateChip'),
    pdfDownloadBtn: document.getElementById('uc6-pdfDownloadBtn'),
    pptxDownloadBtn: document.getElementById('uc6-pptxDownloadBtn')
  };

  function getUC6SelectedBatchId() {
    if (uc6Els.batchSelect?.value === 'custom') {
      return (uc6Els.customBatchId?.value || '').trim();
    }
    return uc6Els.batchSelect?.value || UC6_DEFAULT_BATCH_ID;
  }

  function getUC6RuntimeContext() {
    const text = uc6Els.runtimeEditor?.value || '{}';
    return JSON.parse(text);
  }

  function setUC6Chip(el, text, stateClass) {
    if (!el) return;
    el.textContent = text;
    el.className = `uc6-chip ${stateClass || 'is-muted'}`;
  }

  function formatUC6Json(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_) {
      return String(value ?? '');
    }
  }

  function getUC6RequiredSlots() {
    const responseSlots = Array.isArray(uc6State.responsePayload?.required_slot_keys)
      ? uc6State.responsePayload.required_slot_keys
      : [];

    if (responseSlots.length) return responseSlots;

    try {
      return Object.keys(getUC6RuntimeContext());
    } catch (_) {
      return ['account_name', 'proposal_date', 'vendor_contact', 'vendor_name'];
    }
  }

  function buildUC6RequestPayload() {
    const runtimeContext = getUC6RuntimeContext();
    const batchId = getUC6SelectedBatchId();

    if (!batchId) {
      throw new Error('published_template_batch_id가 비어 있습니다.');
    }

    if (!runtimeContext || typeof runtimeContext !== 'object' || Array.isArray(runtimeContext)) {
      throw new Error('Runtime Context는 JSON object여야 합니다.');
    }

    return {
      published_template_batch_id: batchId,
      runtime_context: runtimeContext,
      collection_options: {
        use_user_input: true
      },
      request_context: {
        caller: 'webapp',
        view: 'uc6_fetchdoc_admin_stage_controller',
        phase: 'ui_shell_mvp',
        sample_case_id: uc6State.selectedSampleId,
        template_approval_status: uc6State.approvalStatus
      }
    };
  }

  function renderUC6TemplateSummary() {
    if (!uc6Els.templateSummary) return;

    const sample = UC6_SAMPLE_CASES[uc6State.selectedSampleId] || UC6_SAMPLE_CASES.acme_runtime_proposal;
    const batchId = getUC6SelectedBatchId();
    const response = uc6State.responsePayload || {};

    const summaryItems = [
      { label: 'Template Batch ID', value: batchId || '미입력' },
      { label: 'Approval Status', value: uc6State.approvalStatus === 'approved' ? '승인 완료' : uc6State.approvalStatus === 'needs_review' ? '수정 필요' : '검토 중' },
      { label: 'Sample Case', value: sample.label },
      { label: 'Runtime Phase', value: response.phase || 'ui_shell_ready' },
      { label: 'Render Run ID', value: response.render_run_id || 'B1 실행 후 표시' },
      { label: 'Next Action', value: response.next_action || 'runtime_render_bridge_pending' }
    ];

    uc6Els.templateSummary.innerHTML = summaryItems.map(item => `
      <div class="uc6-summary-card">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </div>
    `).join('');
  }

  function renderUC6SlotTable() {
    if (!uc6Els.slotTableBody) return;

    let runtimeContext = {};
    try { runtimeContext = getUC6RuntimeContext(); } catch (_) { runtimeContext = {}; }

    const keys = getUC6RequiredSlots();
    uc6Els.slotTableBody.innerHTML = keys.map((key) => {
      const value = runtimeContext[key];
      const filled = value !== undefined && value !== null && String(value).trim() !== '';
      return `
        <tr>
          <td><code>${escapeHtml(key)}</code></td>
          <td>runtime_context</td>
          <td>Yes</td>
          <td><span class="uc6-table-status ${filled ? 'is-ready' : 'is-warning'}">${filled ? 'filled' : 'missing'}</span></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="4">표시할 Slot이 없습니다.</td></tr>';
  }

  function renderUC6ReadinessSummary() {
    if (!uc6Els.readinessSummary) return;

    const response = uc6State.responsePayload || {};
    const cards = [
      { label: 'success', value: response.success === true ? 'true' : response.success === false ? 'false' : 'not_run', tone: response.success === true ? 'ready' : response.success === false ? 'danger' : 'muted' },
      { label: 'readiness_status', value: response.readiness_status || 'not_run', tone: response.readiness_status === 'completed' ? 'ready' : 'muted' },
      { label: 'candidate_slot_value_count', value: response.candidate_slot_value_count ?? '-', tone: 'muted' },
      { label: 'blocking_issue_count', value: response.blocking_issue_count ?? '-', tone: response.blocking_issue_count === 0 ? 'ready' : 'warning' },
      { label: 'warning_count', value: response.warning_count ?? '-', tone: response.warning_count === 0 ? 'ready' : 'warning' },
      { label: 'next_action', value: response.next_action || 'runtime_render_bridge_pending', tone: 'locked' }
    ];

    uc6Els.readinessSummary.innerHTML = cards.map(card => `
      <div class="uc6-readiness-card is-${escapeHtml(card.tone)}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
      </div>
    `).join('');
  }

  function renderUC6ArtifactTable() {
    if (!uc6Els.artifactTableBody) return;

    const artifacts = uc6State.responsePayload?.artifacts && typeof uc6State.responsePayload.artifacts === 'object'
      ? uc6State.responsePayload.artifacts
      : UC6_DEFAULT_ARTIFACTS;

    const ready = uc6State.responsePayload?.success === true;

    uc6Els.artifactTableBody.innerHTML = Object.entries(artifacts).map(([alias, file]) => `
      <tr>
        <td><code>${escapeHtml(alias)}</code></td>
        <td>${escapeHtml(file)}</td>
        <td><span class="uc6-table-status ${ready ? 'is-ready' : 'is-muted'}">${ready ? 'reported' : 'expected'}</span></td>
      </tr>
    `).join('');
  }

  function renderUC6DebugPanel() {
    if (!uc6Els.debugJson) return;

    const debugPayload = {
      safety_boundary: {
        browser_calls: 'n8n public webhook only',
        forbidden_in_browser: ['internal auth header', 'FastAPI internal endpoint', 'internal artifact lookup', 'internal file path'],
        final_render: 'disabled_in_ui_shell_mvp'
      },
      request: uc6State.requestPayload,
      response: uc6State.responsePayload,
      error: uc6State.lastError
    };

    uc6Els.debugJson.textContent = formatUC6Json(debugPayload);
  }

  function getUC6StageState(stageId) {
    const hasPptx = Boolean(uc6State.pptxFileName);
    const approved = uc6State.approvalStatus === 'approved';
    const response = uc6State.responsePayload;
    const success = response?.success === true;
    const failed = response?.success === false || Boolean(uc6State.lastError);

    if (stageId === 'pptx_upload') return hasPptx ? 'done' : 'active';
    if (stageId === 'template_analysis') return hasPptx ? 'done' : 'idle';
    if (stageId === 'template_approval') return approved ? 'done' : uc6State.approvalStatus === 'needs_review' ? 'error' : 'active';
    if (stageId === 'slot_contract') return success ? 'done' : approved ? 'active' : 'idle';
    if (stageId === 'runtime_context') return 'done';
    if (stageId === 'databag_prep') {
      if (uc6State.isRunning) return 'active';
      if (failed) return 'error';
      return success ? 'done' : 'idle';
    }
    return 'locked';
  }

  function renderUC6StageTimeline() {
    if (!uc6Els.stageTimeline) return;

    uc6Els.stageTimeline.innerHTML = UC6_STAGE_MODEL.map((stage, idx) => {
      const state = getUC6StageState(stage.id);
      return `
        <div class="uc6-stage-node is-${escapeHtml(state)}">
          <span class="uc6-stage-index">${idx + 1}</span>
          <div>
            <strong>${escapeHtml(stage.label)}</strong>
            <small>${escapeHtml(stage.detail)}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderUC6MiniPipeline() {
    if (!uc6Els.miniPipeline) return;
    const response = uc6State.responsePayload;
    const databagState = uc6State.isRunning ? 'is-active' : response?.success === true ? 'is-done' : uc6State.lastError ? 'is-error' : 'is-idle';
    uc6Els.miniPipeline.innerHTML = `
      <span class="uc6-pipeline-pill is-done">템플릿</span>
      <span class="uc6-pipeline-pill is-done">Context</span>
      <span class="uc6-pipeline-pill ${databagState}">Databag</span>
      <span class="uc6-pipeline-pill is-locked">PDF</span>
    `;
  }

  function renderUC6RuntimeContextPreview() {
    if (!uc6Els.runtimeContextPreview) return;
    try {
      const context = getUC6RuntimeContext();
      uc6Els.runtimeContextPreview.textContent = formatUC6Json(context);
      setUC6Chip(uc6Els.contextStateChip, 'JSON 정상', 'is-ready');
    } catch (error) {
      uc6Els.runtimeContextPreview.textContent = `Runtime Context JSON 오류: ${error.message}`;
      setUC6Chip(uc6Els.contextStateChip, 'JSON 오류', 'is-danger');
    }
  }

  function renderUC6Hero() {
    const response = uc6State.responsePayload;
    if (uc6Els.heroStatusText) {
      if (uc6State.isRunning) uc6Els.heroStatusText.textContent = 'Databag Prep 실행 중';
      else if (uc6State.lastError) uc6Els.heroStatusText.textContent = 'Databag Prep 실패';
      else if (response?.success === true) uc6Els.heroStatusText.textContent = 'Databag 준비 완료';
      else uc6Els.heroStatusText.textContent = 'UI Shell 준비';
    }

    if (uc6Els.heroStatusSubtext) {
      if (response?.render_run_id) uc6Els.heroStatusSubtext.textContent = response.render_run_id;
      else if (uc6State.lastError) uc6Els.heroStatusSubtext.textContent = uc6State.lastError.message || '실행 중 오류가 발생했습니다.';
      else uc6Els.heroStatusSubtext.textContent = 'B1 Databag Prep webhook만 연결됩니다.';
    }

    if (uc6Els.actionHelper) {
      if (uc6State.isRunning) uc6Els.actionHelper.textContent = 'n8n Runtime Databag Prep webhook 응답을 기다리는 중입니다.';
      else if (uc6State.lastError) uc6Els.actionHelper.textContent = `오류: ${uc6State.lastError.message}`;
      else if (response?.success === true) uc6Els.actionHelper.textContent = 'Databag readiness가 완료되었습니다. Render Bridge와 PDF 생성은 후속 단계입니다.';
      else uc6Els.actionHelper.textContent = 'B1 Runtime Databag Prep까지 실행합니다. Render Bridge와 PDF 생성은 잠금 상태입니다.';
    }
  }

  function renderUC6DownloadPlaceholders() {
    if (uc6Els.previewStateChip) {
      const response = uc6State.responsePayload;
      if (response?.success === true) setUC6Chip(uc6Els.previewStateChip, 'Render Bridge 대기', 'is-locked');
      else setUC6Chip(uc6Els.previewStateChip, 'Preview 대기', 'is-locked');
    }

    if (uc6Els.pdfDownloadBtn) uc6Els.pdfDownloadBtn.disabled = true;
    if (uc6Els.pptxDownloadBtn) uc6Els.pptxDownloadBtn.disabled = true;
  }

  function renderUC6All() {
    if (!uc6Els.section) return;
    renderUC6TemplateSummary();
    renderUC6SlotTable();
    renderUC6ReadinessSummary();
    renderUC6ArtifactTable();
    renderUC6DebugPanel();
    renderUC6StageTimeline();
    renderUC6MiniPipeline();
    renderUC6RuntimeContextPreview();
    renderUC6Hero();
    renderUC6DownloadPlaceholders();
  }

  function setUC6ActiveTab(tabId) {
    uc6State.activeTab = tabId;
    uc6Els.tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.uc6Tab === tabId);
    });

    document.querySelectorAll('#view-uc6 .uc6-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `uc6-panel-${tabId}`);
    });
  }

  function resetUC6Shell() {
    uc6State.responsePayload = null;
    uc6State.requestPayload = null;
    uc6State.lastError = null;
    uc6State.isRunning = false;
    if (uc6Els.runBtn) uc6Els.runBtn.disabled = false;
    renderUC6All();
    setUC6ActiveTab('template');
  }

  async function runUC6DatabagPrep() {
    if (!uc6Els.runBtn) return;

    try {
      uc6State.isRunning = true;
      uc6State.lastError = null;
      uc6State.responsePayload = null;
      uc6State.requestPayload = buildUC6RequestPayload();
      uc6Els.runBtn.disabled = true;
      renderUC6All();
      setUC6ActiveTab('databag');

      const res = await fetch(CONFIG.UC6_RUNTIME_DATABAG_PREP_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(uc6State.requestPayload)
      });

      const rawText = await res.text();
      let data;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (_) {
        throw new Error(`n8n 응답 JSON 파싱 실패 (${res.status})`);
      }

      if (!res.ok) {
        const message = data.message || data.error || `Databag Prep 실패 (${res.status})`;
        throw new Error(message);
      }

      uc6State.responsePayload = data;
      uc6State.lastError = null;
      setUC6ActiveTab('artifacts');
    } catch (error) {
      uc6State.lastError = {
        message: error.message || '알 수 없는 오류',
        name: error.name || 'Error'
      };
      setUC6ActiveTab('debug');
    } finally {
      uc6State.isRunning = false;
      if (uc6Els.runBtn) uc6Els.runBtn.disabled = false;
      renderUC6All();
    }
  }

  function initUC6() {
    if (!uc6Els.section) return;

    const defaultSample = UC6_SAMPLE_CASES[uc6State.selectedSampleId];
    if (uc6Els.runtimeEditor && defaultSample) {
      uc6Els.runtimeEditor.value = formatUC6Json(defaultSample.runtime_context);
    }

    uc6Els.pptxInput?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      uc6State.pptxFileName = file?.name || '';
      if (uc6State.pptxFileName) {
        if (uc6Els.pptxUploadText) uc6Els.pptxUploadText.textContent = 'PPTX 선택 완료';
        if (uc6Els.pptxFileName) {
          uc6Els.pptxFileName.textContent = uc6State.pptxFileName;
          uc6Els.pptxFileName.style.display = 'block';
        }
        setUC6Chip(uc6Els.pptxStateChip, '샘플 선택됨', 'is-ready');
      } else {
        setUC6Chip(uc6Els.pptxStateChip, '업로드 대기', 'is-muted');
      }
      renderUC6All();
    });

    uc6Els.batchSelect?.addEventListener('change', () => {
      const isCustom = uc6Els.batchSelect.value === 'custom';
      if (uc6Els.customBatchId) uc6Els.customBatchId.style.display = isCustom ? 'block' : 'none';
      uc6State.selectedBatchId = getUC6SelectedBatchId();
      resetUC6Shell();
    });

    uc6Els.customBatchId?.addEventListener('input', () => {
      uc6State.selectedBatchId = getUC6SelectedBatchId();
      renderUC6All();
    });

    uc6Els.gateButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        uc6State.approvalStatus = btn.dataset.uc6Approval || 'pending';
        uc6Els.gateButtons.forEach((item) => item.classList.toggle('active', item === btn));
        if (uc6State.approvalStatus === 'approved') setUC6Chip(uc6Els.approvalChip, '승인 완료', 'is-ready');
        else if (uc6State.approvalStatus === 'needs_review') setUC6Chip(uc6Els.approvalChip, '수정 필요', 'is-danger');
        else setUC6Chip(uc6Els.approvalChip, '승인 대기', 'is-warning');
        renderUC6All();
      });
    });

    uc6Els.sampleCase?.addEventListener('change', () => {
      uc6State.selectedSampleId = uc6Els.sampleCase.value;
      const sample = UC6_SAMPLE_CASES[uc6State.selectedSampleId] || UC6_SAMPLE_CASES.acme_runtime_proposal;
      if (uc6Els.runtimeEditor) uc6Els.runtimeEditor.value = formatUC6Json(sample.runtime_context);
      resetUC6Shell();
    });

    uc6Els.runtimeEditor?.addEventListener('input', () => {
      uc6State.responsePayload = null;
      uc6State.lastError = null;
      renderUC6All();
    });

    uc6Els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => setUC6ActiveTab(tab.dataset.uc6Tab || 'template'));
    });

    uc6Els.runBtn?.addEventListener('click', runUC6DatabagPrep);
    uc6Els.resetBtn?.addEventListener('click', resetUC6Shell);

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