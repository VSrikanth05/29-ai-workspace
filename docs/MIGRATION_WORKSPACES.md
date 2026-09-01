# Workspace and source migration

Migration `20260728183000_workspace_sources` is additive and preserves every
existing document.

## Data transformation

1. Create the `WorkspaceRole` enum, `Workspace`, and `WorkspaceMember` tables.
2. Add nullable workspace, metadata, checksum, and processing-error fields.
3. Create one personal workspace and owner membership per existing profile.
4. Attach each existing document to its uploader's personal workspace.
5. Make `Document.workspaceId` required and add tenant/status indexes.

## Deployment order

Back up PostgreSQL, deploy and run `npx prisma migrate deploy`, then deploy the
API and workers followed by the frontend. Old clients continue using `/documents`.
Rollback should restore the pre-migration backup because dropping tenant links
would discard ownership information created after deployment.

For R2, create a private bucket and scoped object read/write credentials. Set
`STORAGE_PROVIDER=r2` plus all `R2_*` variables. Existing stored objects are not
automatically copied; keep `supabase` selected until an explicit object migration
has been completed.
