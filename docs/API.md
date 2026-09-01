# API contracts

The Next.js frontend proxies
`/api/:path*` to the NestJS base URL configured by `BACKEND_INTERNAL_URL`; the
prefix is removed before forwarding, preserving existing NestJS routes.

## Existing public routes

- Authentication: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- Documents: upload, list, detail, signed download URL, and deletion under
  `/documents`
- Conversations: session CRUD plus streaming and non-streaming messages under
  `/chat/sessions`
- AI: `/llm/providers`, document summaries, and the legacy document Mind Map/diagram route
- Operations: `/health`, `/health/live`, `/health/ready`, `/metrics`

## Frontend-only route

- `GET /healthz` returns the Next.js service health payload. It is not part of
  the NestJS domain API.

All original domain endpoints retain their authorization, validation, request,
response, error, and streaming behavior. Milestone 2 uses additive routes.

## AI Core endpoints (Milestone 3)

All endpoints require a bearer token.

- `POST /ai/chat` — generate and persist one grounded response.
- `POST /ai/chat/stream` — equivalent operation using SSE.
- `GET /ai/health` — authenticated provider and prompt-version diagnostics.
- `GET /conversations` — list the current user's conversations by activity.
- `GET /conversations/:id` — conversation and ordered message history.
- `POST /conversations` — create a workspace-associated conversation.
- `DELETE /conversations/:id` — delete a conversation and its messages.
- `GET /models` — dynamic model catalog.
- `GET /providers` — dynamic provider catalog and configuration state.

Chat requests contain `message` and either `conversationId`, or `workspaceId`
when starting a new conversation. Optional fields are `selectedSourceIds`,
`provider`, `model`, `temperature` (0–2), `topP` (0–1), and `maxTokens`
(1–32768). Provider IDs are `openai`, `gemini`, `anthropic`, and `openrouter`.

The stream response uses `text/event-stream`, emits `delta` events followed by
one `done` event, and may emit an `error` event with a stable code and request
ID. It advertises a 3-second reconnect delay, disables proxy buffering, and
propagates client disconnects to provider fetch cancellation. Clients must not
replay the same message automatically after a partial stream; reload the
conversation first and retry explicitly.

Legacy `/chat/sessions` and `/llm/providers` routes remain unchanged.

## Learning and Analytics endpoints (Milestone 5)

All routes are authenticated and additive:

- `POST /ai-studio/flashcards` accepts optional `count` (`5`, `10`, or `20`)
  and `difficulty` (`easy`, `medium`, or `hard`).
- `POST /ai-studio/quiz` accepts optional `questionCount` (`5`, `10`, or `20`)
  and `difficulty`.
- `POST /ai-studio/study-guide` creates the approved six-section guide.
- `POST /ai-studio/analytics` requires `sourceId` for an ingested CSV/XLSX.
- `POST /ai-studio/chart` requires `sourceId` and `chartType` (`bar`, `line`,
  `pie`, `scatter`, `histogram`, or `area`); `xKey` and `yKey` are optional.

The output export endpoint additionally accepts `format=csv` for Analytics
Reports and Charts. PNG and SVG chart exports are generated in the browser from
the persisted chart definition.

## AI Studio endpoints (Milestone 4)

All routes require authentication and are additive:

- `POST /ai-studio/explain`
- `POST /ai-studio/rewrite`
- `POST /ai-studio/simplify`
- `POST /ai-studio/summary`
- `POST /ai-studio/key-points`
- `POST /ai-studio/glossary`
- `POST /ai-studio/mind-map`
- `POST /ai-studio/translate`
- `POST /ai-studio/report`

The common body includes `workspaceId` and optional `conversationId`,
`sourceIds`, `text`, `provider`, `model`, `temperature`, and `maxTokens`.
Summary adds `style` (`short`, `medium`, `detailed`, or `bullet`). Translation
requires `targetLanguage` and optionally accepts `sourceLanguage`. Report adds
`style` (`executive`, `detailed`, or `bullet`). Selected text takes precedence
over document material; otherwise selected sources or workspace-grounded RAG
context is used.

Persistent output APIs:

- `GET /ai-studio/outputs?workspaceId=...` — output history.
- `GET /ai-studio/outputs/:id` — reopen an output.
- `POST /ai-studio/outputs/:id/regenerate` — create a regenerated saved output.
- `GET /ai-studio/outputs/:id/export?format=markdown|json` — portable export.

Mind Map PNG and SVG export is performed in the browser from the stored
hierarchical JSON. The old `/documents/:id/diagram` contract remains available
as a legacy compatibility route.

## Workspace endpoints (Milestone 2)

- `GET /workspaces` — list memberships with role and resource counts.
- `POST /workspaces` — create a workspace and owner membership.
- `GET /workspaces/:workspaceId` — get members and source count.

All routes require a bearer token. Workspace names are trimmed and limited to 80
characters.

## Source endpoints (Milestone 2)

- `POST /workspaces/:workspaceId/sources` — multipart upload using field `file`.
- `GET /workspaces/:workspaceId/sources?search=&status=&format=&cursor=&limit=` —
  paginated search and filters.
- `GET /workspaces/:workspaceId/sources/:sourceId` — source plus normalized chunks.
- `GET /workspaces/:workspaceId/sources/:sourceId/download-url` — short-lived URL.
- `POST /workspaces/:workspaceId/sources/:sourceId/retry` — retry failed ingestion.
- `DELETE /workspaces/:workspaceId/sources/:sourceId` — remove data and object.

Uploads accept PDF, DOCX, PPTX, XLSX, CSV, Markdown, and TXT up to 20 MB. Editors
and owners can mutate sources; viewers have read-only access. The legacy
`/documents` endpoints and their response shapes remain available.

## Knowledge workspace endpoints (Milestone 6)

Authenticated routes are workspace-isolated; viewer access is sufficient for
reads and editor access is required for mutations.

- `GET|POST /collections`, `PATCH|DELETE /collections/:id`
- `POST /collections/:id/items`, `DELETE /collections/:id/items/:itemId`
- `GET|POST /tags`, `PATCH|DELETE /tags/:id`
- `POST /tags/:id/assign`, `DELETE /tags/:id/assignments/:assignmentId`
- `GET|POST /favorites`, `DELETE /favorites/:id`
- `GET /search?workspaceId=&query=&tagId=`
- `POST /share`, `DELETE /share/:id`
- `GET /preferences?workspaceId=`, `PATCH /preferences`
- `GET /outputs/:id/versions`, `POST /outputs/:id/restore`
- `POST /outputs/:id/duplicate`, `DELETE /outputs/:id`

`GET /share/:token` is intentionally public and read-only. Expired, revoked,
unknown, or deleted targets cannot be resolved. Share creation returns the raw
token once in the URL; the database stores only its SHA-256 hash.

## Production API additions (Milestone 7)

- `POST /auth/logout` records logout and confirms client-session termination.
- `GET /conversations?limit=1..100&cursor=` enables cursor pagination; omitting
  pagination preserves the original array response.
- `GET /conversations/:id?messageLimit=1..200` bounds initial message loading.
- `GET /ai-studio/outputs?workspaceId=&limit=1..100&cursor=` returns
  `{items,nextCursor}` when paginated; the original query still returns an array.
- `/health/live`, `/health/ready`, and `/metrics` retain their routes. Readiness
  now reports database, required Redis, storage configuration, and LLM provider
  configuration in production.

All mutation and export routes produce audit events. Cursor parameters are
additive and existing clients remain backward compatible.
