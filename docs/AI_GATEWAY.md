# AI Gateway

The Milestone 3 AI Gateway is implemented in `backend/src/ai`. Application code
uses `AiService`; provider selection is isolated in `ProviderRouterService`.
The router maps the public IDs `openai`, `gemini`, `anthropic`, and `openrouter`
to the established provider adapters without exposing provider details to
controllers or frontend components.

## Request lifecycle

1. Authentication resolves the current user.
2. Workspace membership and selected-source ownership are verified.
3. The Context Builder loads persistent conversation memory and source scope.
4. The Prompt Engine composes versioned workspace instructions.
5. The unchanged retrieval pipeline assembles grounded RAG context.
6. The Provider Router validates the provider/model pair and invokes the common
   generation interface.
7. The response and usage outcome are persisted and metrics are emitted.

Provider failures remain typed and are never silently replaced with mock output.
Model catalogs are seeded from environment-backed providers and retrieved through
`GET /providers` and `GET /models`. Generation options are passed through the
common interface and translated only inside provider adapters.

`ModelUsage` is analytics-only. It stores estimated input/output token counts,
latency, success, request ID, and stream mode; it has no billing behavior.
