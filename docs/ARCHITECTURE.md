# 29 AI Workspace architecture

## System context

29 AI Workspace is a modular SaaS platform with two independently deployable
applications. Next.js owns routing, rendering, responsive UX, and browser-side
state. NestJS owns authentication enforcement, source ingestion, AI provider
orchestration, retrieval, conversations, and generated artifacts. PostgreSQL is
the source of truth, pgvector supports semantic retrieval, Redis coordinates
cache and durable BullMQ work, and object storage contains source binaries.

```text
Browser -> Next.js 15 -> /api rewrite -> NestJS -> PostgreSQL/pgvector
                                         |  |----> Redis/BullMQ worker
                                         |-------> Object storage + AI providers
```

## Frontend boundaries

- `app/`: route composition, metadata, layouts, health endpoint.
- `components/ui`: framework-agnostic accessible primitives.
- `components/layout`: global navigation and platform chrome.
- `features/*`: source, conversation, studio, and workspace capabilities.
- `config`: typed navigation and AI Studio tool registries.
- `stores`: ephemeral cross-component interaction state only.
- `lib`: infrastructure factories and pure utilities.

Server components are the default. Client boundaries exist only for interaction,
theme, query caching, and local workspace state. TanStack Query will own remote
server state; Zustand must not duplicate API resources.

## Backend boundaries

NestJS modules remain aligned to business capabilities: auth, workspaces, documents, chat,
RAG, summaries, Mind Maps, and LLM routing. Milestone 3's `ai` module is the
public AI Gateway above the legacy-compatible `llm`, `chat`, and `rag` modules.
Infrastructure modules provide
Prisma, Redis, metrics, queues, and storage adapters through dependency
injection. Public API contracts remain stable across the frontend migration.

## Workspace and source domain

`Workspace` is the tenant aggregate. `WorkspaceMember` stores the role used by
the centralized access service (`OWNER`, `EDITOR`, or `VIEWER`). Every source is
stored in the existing `Document` model with a required `workspaceId`; this keeps
chunking, embeddings, summaries, legacy Mind Maps, chat, and RAG unchanged. Object keys
are isolated as `{workspaceId}/{uploaderId}/{uuid}-{safeName}`.

The source ingestion lifecycle is `UPLOADED -> PROCESSING -> PROCESSED` or
`FAILED`. The record includes SHA-256 integrity data, normalized parser metadata,
and a safe processing error. Cloudflare R2 and Supabase implement the same
`ObjectStorage` port. R2 is recommended for production; Supabase is retained for
backward compatibility.

TanStack Query owns workspace/source server state, processing polling, and cache
invalidation. Zustand stores only active workspace/panel selections. Uploads use
XHR for byte-level progress and support cancellation without duplicating API data.

## AI Core

The request path is `AI controller -> AI service -> context builder -> prompt
engine -> existing RAG retrieval -> provider router -> provider`. OpenAI,
Gemini, Anthropic, and OpenRouter share one generation contract; public provider
IDs are mapped inside the router. Controllers and UI contain no provider-specific
request logic.

`ChatSession` and `ChatMessage` remain the physical persistence models to avoid a
breaking migration. The new `/conversations` API presents them as conversations,
adding workspace, provider, model, generation settings, last activity, metadata,
and streaming status. `ModelUsage` records analytics-only token estimates,
latency, outcome, and request correlation. SSE completion persists one assistant
message atomically; cancellation never persists a partial assistant response.

## Security and reliability

Same-origin API access reduces CORS exposure. Both applications emit security
headers; NestJS additionally applies authentication guards, validation, rate
limits, upload content validation, CSP, and request timeouts. Runtime containers
are non-root and read-only. Readiness checks cover PostgreSQL and required
Redis. Production dependency audits run in CI.

## Architecture decisions

1. Keep frontend and API independently deployable to support Vercel plus
   Railway/Fly.io as well as a unified Docker stack.
2. Preserve the existing REST API during the UI migration to avoid coupled
   frontend/backend releases.
3. Represent the 29 tools as a typed registry so navigation, permissions,
   analytics, and execution routing can share stable identifiers.
4. Workspace membership is checked before every workspace-scoped source read or
   mutation; non-members receive a not-found response to avoid tenant discovery.
5. Keep `/documents` as a compatibility façade while new clients use additive
  `/workspaces/:workspaceId/sources` routes.
6. AI Studio is a modular consumer of the AI Gateway. Category modules under
   `backend/src/ai-studio` own Understand, Learn, Visualize, Language, and Create
   behavior while a shared service owns authorization, conversation reuse,
   output persistence, regeneration, and export.

## AI Studio outputs

`AIOutput` stores the six durable output types: Summary, Key Points, Glossary,
Mind Map, Translation, and Report. Every record belongs to a user, workspace,
and conversation; `AIOutputSource` associates selected sources without changing
the source aggregate. Content is typed JSON: Markdown outputs use a `markdown`
field and Mind Maps use a bounded hierarchical `root` tree.

Understand actions reuse persistent conversations but are not saved as AIOutput
types because the approved output enum does not include Explain, Rewrite, or
Simplify. The legacy `/documents/:id/diagram` endpoint and physical
`DocumentDiagram` model remain only as backward-compatible Mind Map/diagram
surfaces; new clients use `/ai-studio/mind-map` and React Flow.

## Learning and analytics

Milestone 5 adds Flashcards, Quiz, Study Guide, Analytics Report, and Chart to
the durable `AIOutput` types. Learning tools use the AI Gateway and validate
structured Flashcard and Quiz JSON before persistence. Analytics reads the
normalized text already produced by CSV/XLSX ingestion and computes reproducible
profiles, missing values, duplicates, correlations, distributions, IQR outliers,
trends, and chart suggestions. Chart outputs store provider-independent
Recharts data/configuration; PNG and SVG rendering stays in the browser.

## Knowledge workspace

Milestone 6 adds domain modules under `backend/src/{knowledge,collections,tags,
search,sharing,preferences}`. Every query starts with `WorkspaceAccessService`;
polymorphic records are constrained to exactly one source or AI output at the
database boundary. Collections use a self-relation for arbitrary nesting and a
position value for drag ordering. Tags and collections use soft deletion.

Share tokens contain 256 bits of entropy; only SHA-256 token hashes are stored.
Public resolution selects one target from the already-bound workspace and never
returns membership or unrelated tenant data. `OutputVersion` stores immutable
content/metadata snapshots. Sharing, restore, and destructive actions emit
structured `KnowledgeAudit` records.

On the frontend, `features/knowledge` owns remote-state hooks and responsive
views. The existing app frame mounts one accessible overlay controller for
universal search, recent searches, command navigation, and keyboard shortcuts.
TanStack Query remains the source of truth for knowledge resources; Zustand
stores only the active workspace and transient shell selections.

## Production infrastructure

OpenTelemetry starts before NestJS and BullMQ load. Node auto-instrumentation
covers inbound/outbound HTTP, supported database clients, Redis, and BullMQ;
explicit spans describe AI gateway calls, embeddings, RAG retrieval, streaming,
and ingestion jobs. Trace context uses W3C propagation and can be exported over
OTLP/HTTP. Instrumentation is disabled unless `OTEL_ENABLED=true`.

Redis is a best-effort acceleration layer for workspace metadata, collections,
tags, search, preferences, and output lists. Cache failures log and increment
metrics but never fail the source-of-truth database request. Mutations remove
resource keys and workspace search prefixes. Default TTL is centrally set by
`CACHE_TTL_SECONDS`.

`AuditEvent` is an append-only operational record without foreign keys, so user
or workspace deletion cannot erase accountability history. The global audit
interceptor records authenticated mutations and sensitive reads such as export,
including user, workspace, action, request ID, IP, user agent, timestamp, and
bounded metadata. Tokens and generated/source content are never recorded.
