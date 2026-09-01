# Milestone 2 — Workspace & Sources

## Architecture

Workspace is the tenant boundary; membership roles are enforced through one
authorization service. Source is the product term for the backward-compatible
Document aggregate. Format parsing still normalizes into text and metadata, so
all AI pipelines remain unchanged. Storage is accessed through an injected port
with Cloudflare R2 and Supabase adapters.

## Folder structure

- `backend/src/workspaces`: aggregate service, role checks, controller, DTOs.
- `backend/src/storage`: object-storage port and Cloudflare R2 adapter.
- `backend/src/documents`: legacy document and workspace source controllers.
- `frontend/features/sources`: API types, queries, upload transport, and UI.
- `frontend/features/auth`: accessible sign-in surface for the existing API.

## Database changes

Adds Workspace, WorkspaceMember, WorkspaceRole, required Document.workspaceId,
parser metadata, SHA-256 checksum, processing error, and tenant-aware indexes.
The migration backfills personal workspaces without deleting or renaming data.

## API endpoints

Adds workspace list/create/detail and source upload/list/detail/download/retry/delete
routes. `/documents`, chat, RAG, summaries, diagrams, and authentication remain
backward compatible.

## Frontend implementation

The Sources panel supports workspace selection, search, drag/drop, multi-file
staging, validation, progress, cancellation, ingestion polling, retry, download,
delete, loading, empty, error, unauthenticated, and ready states. Controls are
keyboard reachable, labelled, responsive, and reduced-motion aware.

## Backend implementation

Role checks prevent cross-tenant reads and writes. Upload records include a
checksum and collision-safe workspace key. Ingestion persists metadata and safe
failure details. Database failures remove the just-uploaded object. R2 uses
private objects and signed download URLs.

## Tests and acceptance criteria

- Existing parser, document, RAG, chat, auth, health, and infrastructure tests pass.
- Workspace access tests cover tenant hiding and role enforcement.
- Personal workspace tests cover idempotency and owner provisioning.
- Frontend tests cover source controls, queues, responsive panels, and 29-tool registry.
- Backend build/lint/tests and frontend build/lint/typecheck/tests pass.
- Existing documents are backfilled and legacy APIs remain available.

## Documentation updates

README, architecture, API, environment contract, database migration guide, and
this milestone record describe deployment and compatibility behavior.
