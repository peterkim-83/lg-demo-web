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
const APP_VERSION = 'app.final.uc3-multi-agent 2026-04-24-v2';
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
});