# UC6 Webapp E2E Stage Controller Patch v1

## Scope

This patch changes only the UC6 webapp surface and keeps UC1~UC5 logic intact.

Changed files:

- `app.js`
- `index.html`
- `style.css`

## UC6 flow wired in app.js

Production n8n endpoints wired:

```text
/fetchdoc/uc6/template/intake-review-prep
/fetchdoc/uc6/template/review-status
/fetchdoc/uc6/template/approval-publish
/fetchdoc/uc6/runtime/context-intelligence-prep
/fetchdoc/uc6/runtime/databag-prep
/fetchdoc/uc6/runtime/render-bridge
/fetchdoc/uc6/final/pdf-delivery
```

Runtime behavior:

```text
PPTX selected: 01A -> 01B poll -> 01C -> 02A0 -> 02A -> 02B -> 02C
No PPTX selected: selected published batch -> 02A0 -> 02A -> 02B -> 02C
```

The no-PPTX path is for already published batches such as:

```text
fd_norm_20260617_052857_8w19ym
```

## Download boundary

02C currently returns final PPTX readiness, but the response indicates that the internal artifact download path requires an internal token and a UI download proxy. The webapp therefore marks PPTX as ready but does not expose an internal `/data` path or internal FastAPI URL. If a future `public_download_url` is returned, the button opens it. Otherwise it shows a proxy-required message.

## Safety

- No UC5 endpoint/registry/payload logic changed.
- No internal token added to browser code.
- No `http://fastapi-app` or `/data/fetchdoc` browser call added.
- UC6 state stores only public-safe response summaries and IDs.
