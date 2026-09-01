# Milestone 3 — AI Core

Status: COMPLETE

Milestone 3 introduces the additive AI Gateway and stops before implementing any
new AI Studio tools.

## Delivered

- Four-provider abstraction for OpenAI, Gemini, Anthropic, and OpenRouter.
- Dynamic provider/model APIs and generation settings.
- Versioned Prompt Engine and workspace-aware Context Builder.
- Persistent workspace conversations and automatic bounded memory.
- Provider-independent SSE with incremental delivery, cancellation, explicit
  errors, retry hints, proxy-safe headers, and atomic completion persistence.
- Analytics-only model usage records and Prometheus request, latency, and stream
  metrics with structured logging.
- Responsive, accessible conversation list/view, source selection, provider and
  model selectors, composer, stop/retry actions, loading/error states, and cited
  results in the existing Workspace shell.
- Additive Prisma migration, backend/frontend tests, and operational docs.

## Compatibility

The implementation reuses the existing RAG retrieval pipeline and physical chat
tables. Legacy `/chat/sessions`, `/llm/providers`, authentication, source,
ingestion, Redis, and BullMQ contracts remain available. No billing, marketplace,
plugin, knowledge graph, collaboration, or post-Milestone-3 AI tool was added.

## Verification

Acceptance requires Prisma validation/generation, backend lint/tests/build,
frontend lint/typecheck/tests/build, Compose configuration validation, and the
existing regression suites. Milestone 4 must not begin without approval.
