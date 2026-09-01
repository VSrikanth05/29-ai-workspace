# 29 AI Workspace — repository gap analysis

This audit is based on the executable source, Prisma schema/migrations, Docker
configuration, environment contract, frontend routes/components, backend
controllers/services, and the repository test suites. “Implemented” means a
working code path exists in this repository; it does not mean the required
third-party account is configured.

## Executive findings

The repository has a real production-oriented baseline: Next.js App Router,
NestJS REST APIs, Supabase Auth, Prisma/PostgreSQL with pgvector, Redis/BullMQ
ingestion, workspace authorization, hybrid retrieval, SSE chat, AI Studio
learning/translation/reporting/mind-map tools, media persistence, search,
sharing, caching, audit logging, metrics, tracing, Docker, CI, and tests.

The highest-impact defect was in the Gemini adapter. Gemini 3 Flash can consume
the generation budget with internal thinking and return a successful response
without answer text. The adapter treated that as an invalid response, producing
the generic provider error. The adapter now sends a configurable low thinking
level for Gemini 3 models by default; see
`backend/src/llm/providers/gemini.provider.ts`.

## Status matrix

Status values are: **Implemented**, **Partially implemented**, **Broken**, and
**Missing**.

### Platform and configuration

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| Frontend | Implemented | Next.js 15 App Router, feature folders, auth/workspace/dashboard/settings/routes, component tests and Playwright smoke tests. |
| Backend | Implemented | NestJS modules, validation pipe, global error filter, health endpoints, metrics, tracing and structured logging. |
| Prisma | Implemented | Shared schema, migrations, pgvector column, indexes, usage/audit/output/media/workspace models. |
| Docker | Partially implemented | Backend/frontend/worker/migrate/Postgres/Redis compose services exist. Backend healthcheck is absent even though frontend depends on `service_healthy`; production startup therefore needs a healthcheck fix. |
| Environment loading | Implemented | Root `.env` and `.env.example` are loaded from stable paths and production validation checks core secrets. Provider-specific model/key validation is still shallow. |
| Secrets handling | Partially implemented | Keys are environment-backed and redacted in logs. Rotation, external secret manager integration, and startup validation of selected-provider credentials are missing. |

### Authentication and tenancy

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| Registration | Implemented | Supabase sign-up plus profile/workspace provisioning. Requires real Supabase configuration. |
| Login | Implemented | Supabase password sign-in returns access/refresh tokens. |
| Logout | Implemented | Guarded endpoint revokes the Supabase session and the frontend clears both storage locations. |
| Forgot password | Implemented | Supabase recovery email flow exists. Email delivery remains a Supabase project configuration concern. |
| Reset password | Implemented | Recovery session is established and password is updated. |
| Email verification | Implemented | Code/token-hash/link verification and profile/workspace creation exist. |
| Refresh token | Implemented | Backend refresh endpoint and frontend single-flight refresh/retry exist. |
| Protected routes | Implemented | Supabase bearer guard and workspace role checks are applied to protected controllers. |
| Session persistence | Implemented | Local/session storage, auth change events, refresh token persistence, and auth bootstrap exist. |
| Workspace creation | Implemented | API and workspace UI exist. |
| Workspace deletion | Missing | No delete workspace controller/service/UI path was found. |
| Workspace switching | Implemented | Workspace list/switcher and Zustand active workspace state exist. |
| Workspace member management/invites | Missing | Members are persisted and roles are checked, but no member CRUD/invite surface exists. |

### Workspace knowledge features

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| Source upload | Implemented | Multipart upload, workspace role check, storage adapters, status/retry/download URL. |
| PDF/DOCX/TXT/Markdown ingestion | Implemented | Format validation, PDF/DOCX/TXT/Markdown extractors/parsers, chunking and ingestion worker. |
| Collections | Implemented | Hierarchical collection CRUD and item operations. |
| Favorites | Implemented | Workspace-scoped favorite list/create/delete. |
| History | Implemented | Conversation and output history routes/pages exist. |
| Output library | Implemented | Persistent AI outputs, versions, restore, duplicate, export, share and regenerate paths exist. |
| Global search | Partially implemented | Searches source names, conversation/output titles, collections and tags. It is not full-content semantic search. |
| Search filters/highlights | Partially implemented | Tag filtering and label highlighting exist; source content and advanced type/date filters do not. |

### RAG and retrieval

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| Chunking | Implemented | Text chunker and ingestion tests exist. |
| Embeddings | Implemented | Provider-backed embeddings, 1536-dimension validation and rebuild command exist. Requires a configured embedding-capable provider. |
| Vector search | Implemented | pgvector cosine retrieval with workspace/document filters. |
| Lexical search | Implemented | PostgreSQL full-text `searchVector` retrieval exists. |
| Hybrid search | Implemented | Parallel vector/text retrieval, weighted fusion and reranking exist. |
| Citation generation | Implemented | Source labels, chunk IDs, scores, excerpts and document metadata are returned. |
| Streaming RAG responses | Implemented | Retrieval precedes provider SSE and the answer is persisted after stream completion. |
| Source highlighting | Missing | Citations contain excerpts but the document viewer does not map citations to highlighted source spans. |
| Multi-document retrieval | Implemented | Workspace-wide retrieval and selected-source filtering exist. |
| OCR/scanned PDFs | Missing | No OCR engine or image/scanned-page extraction path exists. |
| Deduplication/re-embedding lifecycle | Partially implemented | Rebuild command exists, but content hashes, embedding versioning and automatic model migration are absent. |

### AI providers and chat

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| Provider abstraction/registry | Implemented | `LlmProvider`, gateway registry, catalog and public-provider router exist. |
| OpenRouter | Implemented | OpenAI-compatible chat, SSE and embeddings adapter. Requires `OPENROUTER_API_KEY`. |
| Gemini | Implemented | REST chat, streaming and embeddings adapter; Gemini 3 thinking-budget defect fixed and tested. |
| OpenAI | Implemented | Chat, streaming and embeddings adapter. Requires `OPENAI_API_KEY`. |
| Ollama | Partially implemented | The Llama adapter can target an OpenAI-compatible `LLAMA_API_URL`; there is no dedicated Ollama discovery/health/model adapter. |
| Anthropic | Partially implemented | Chat/SSE adapter exists; embeddings delegate to deterministic mock vectors, which is not production semantic retrieval. |
| Provider fallback | Missing | The gateway intentionally surfaces provider failures and does not implement configured-provider fallback. |
| Timeout handling | Partially implemented | HTTP server/provider-specific media timeout exists, but LLM fetch calls do not consistently enforce a provider timeout. |
| Retry logic | Missing | LLM provider requests have no bounded retry/backoff policy. |
| Tool calling | Missing | Provider message types contain only text role/content; no tool schema, execution loop or tool result protocol exists. |
| Streaming | Implemented | SSE endpoints, cancellation signal, terminal events and persistence exist. |
| Markdown rendering | Missing | Conversation messages render as escaped pre-wrapped text; `react-markdown` is installed but not used there. |
| Code highlighting | Missing | No syntax-highlighting renderer was found. |
| Copy response | Missing | No response copy action was found in the conversation UI. |
| Regenerate | Partially implemented | Output regeneration exists; conversation-level regenerate is missing. |
| Stop generation | Implemented | AbortController is wired from the UI to provider fetch. |
| Retry | Implemented | UI retries the most recent user message. Provider retry/backoff remains missing. |
| Conversation rename | Missing | Titles are auto-generated on first message, but no rename endpoint/UI exists. |
| Conversation delete/history | Implemented | Conversation listing, retrieval and deletion exist. |
| Model switching | Partially implemented | Catalog/preferences can select provider/model in Studio; the main conversation UI does not expose an explicit selector. |
| Token usage | Partially implemented | Usage records store input/output text and latency, but provider token counts are not parsed/persisted. |
| Cost estimation | Missing | No pricing catalog or cost computation exists. |

### Translation

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| Text translation | Implemented | AI Studio translation endpoint supports selected text and grounded source material. |
| Language detection | Partially implemented | Prompt requests automatic detection, but there is no separate detector/result field. |
| 100+ languages | Partially implemented | Target language is a free-form validated string; there is no supported-language catalog or explicit 100+ language validation. |
| PDF/DOCX translation | Partially implemented | Extracted document material can be translated and saved as text output; original file-format translation/export is absent. |
| Batch translation | Missing | No batch job/API/UI exists. |

### Image, video and audio

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| OpenAI image generation | Implemented | OpenAI images endpoint, byte validation, object storage and persisted media asset. |
| Gemini/Flux/Stable Diffusion image providers | Missing | No provider adapters/configuration found. |
| Text-to-image | Implemented | OpenAI image prompt path exists. |
| Image-to-image/background removal/upscaling | Missing | No input image or transformation endpoints exist. |
| Image history/downloads | Partially implemented | Media assets persist and signed URLs are returned; no dedicated gallery/list/download management surface exists. |
| Video generation | Partially implemented | Generic configured provider endpoint, processing/completed/failed asset states and job IDs exist. |
| Runway/Veo/Kling/Pika/Luma | Missing | No provider-specific adapters. |
| Video jobs/progress/cancellation/download | Partially implemented | A job ID can be stored, but polling/webhooks, progress, cancellation and a complete download workflow are absent. |
| Text-to-speech | Implemented | OpenAI speech endpoint and stored audio asset exist. |
| Speech-to-text | Missing | No transcription endpoint/provider path. |
| Voice cloning | Missing | No provider or consent/workflow. |
| Subtitle generation/audio translation | Missing | No subtitle or audio translation pipeline. |

### OCR

| Feature | Status | Evidence and remaining gap |
| --- | --- | --- |
| PDF OCR | Missing | PDF extractor is text extraction only. |
| Image OCR | Missing | No image upload/OCR route or OCR dependency. |
| Handwriting/receipt/invoice OCR | Missing | No specialized OCR model, schema, parser or UI. |

### AI Studio

| Feature group | Status | Evidence and remaining gap |
| --- | --- | --- |
| Summarizer, rewrite, grammar/simplify, explain | Partially implemented | Summary, explain, rewrite and simplify routes exist; no distinct grammar tool. |
| Blog generator, email writer, LinkedIn writer, resume builder | Missing | No tool route/configuration found. |
| Presentation generator | Missing | No presentation generation/export path. |
| Mindmap generator | Implemented | JSON hierarchy generation, validation, persistence and viewer exist. |
| Flowchart/diagram generator | Partially implemented | Mermaid diagram generation exists for documents/mind maps; no general flowchart/diagram Studio workflow. |
| Website generator, SQL generator, code generator | Missing | No dedicated tool contracts or execution/sandbox path. |
| Learning tools | Implemented | Summary/key points/glossary/flashcards/quiz/study-guide routes, parsing and UI exist. |
| Analytics/charts | Implemented | CSV/XLSX profiling, analytics and six chart types exist. |

### Integrations, notifications, administration and billing

| Area | Status | Evidence and remaining gap |
| --- | --- | --- |
| Google Drive, OneDrive, Dropbox | Missing | No OAuth connector, token model or sync worker. |
| GitHub, Slack, Discord, Notion, Gmail, Outlook, Jira, Confluence | Missing | No connector modules or workspace-scoped sync contracts. |
| Toast notifications | Partially implemented | Inline error/status UI exists; no shared toast notification system was found. |
| Email/push/webhook notifications | Missing | No notification model, queue, provider or webhook delivery. |
| Admin users/roles/permissions | Missing | Workspace roles exist, but no admin module or global RBAC management. |
| Admin analytics/logs/audit | Partially implemented | Metrics, structured logs and persistent audit events exist for operators; no admin dashboard/query API. |
| Stripe billing/plans/credits/usage/invoices | Missing | No Stripe SDK, billing schema, webhook or entitlement enforcement. |

### Performance, security and testing

| Area | Status | Evidence and remaining gap |
| --- | --- | --- |
| Streaming/per-request caching | Implemented | SSE, compression, Redis cache and query caching exist. |
| Lazy loading/Suspense | Partially implemented | Suspense is used for auth flows; no broad route/component lazy-loading strategy. |
| Virtualization/image optimization/RSC | Partially implemented | App Router/RSC baseline exists, but no list virtualization and no media gallery optimization; media UI avoids `next/image` for runtime hosts. |
| JWT/refresh/RBAC | Implemented | Supabase validates JWTs, refresh flow exists, and workspace roles gate access. |
| CSP/Helmet/CORS/rate limiting | Implemented | Backend Helmet/CORS/throttling and frontend CSP/security headers exist. |
| Validation/sanitization | Implemented | Global whitelist/forbid validation, DTO constraints, file validation and log redaction exist. |
| CSRF | Partially implemented | Bearer-token API plus CORS reduces cookie-CSRF exposure; there is no explicit CSRF token middleware. |
| XSS/SQL injection | Implemented | React escaping, CSP, Prisma parameterization/raw SQL helpers and validation are present; ongoing dependency/security review remains required. |
| Distributed rate limiting | Missing | Nest throttling is process-local; Redis-backed throttling is not wired. |
| Unit/integration tests | Implemented | Backend 43 suites/121 tests passed in the audit; frontend component tests exist. |
| Lint/typecheck/build | Partially implemented | Frontend/backend typecheck/build passed. Frontend `npm test -- --runInBand` is invalid because Vitest does not accept Jest’s flag; the plain `npm test` command must be used. |
| Playwright | Partially implemented | Production smoke suite/config exists; it uses mocked APIs and does not validate real provider/database/integration behavior. |
| Provider contract tests | Partially implemented | Gemini and gateway tests exist; OpenAI/OpenRouter/Anthropic/Llama contract coverage is incomplete. |

## Required external configuration

The repository cannot complete these items without external accounts or
credentials: Supabase project/auth email delivery, PostgreSQL/pgvector,
Redis, at least one LLM key, object storage, production media providers,
OAuth applications for each integration, an OCR provider/model, Stripe
account/webhooks, and push/email delivery credentials. No credentials are
hardcoded or invented.

## Verification snapshot

At audit time:

- frontend typecheck and production build passed;
- backend typecheck, production build, and 43 Jest suites / 121 tests passed;
- Prisma schema validation passed;
- Docker Compose configuration parsing passed;
- Gemini live model and embedding endpoint checks passed with configured local
  credentials, without printing key material;
- frontend test invocation with `--runInBand` failed because that flag is not
  supported by Vitest; this is a command mismatch, not a product test failure.

The next implementation priorities are provider contract hardening and timeout/
retry policy, then conversation UX gaps, OCR/translation jobs, media job
orchestration, integrations, billing, admin, and distributed operations.
