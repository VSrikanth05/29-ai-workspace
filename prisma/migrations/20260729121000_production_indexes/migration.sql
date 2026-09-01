CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Document_originalName_trgm_idx" ON "Document" USING GIN ("originalName" gin_trgm_ops);
CREATE INDEX "ChatSession_title_trgm_idx" ON "ChatSession" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "AIOutput_title_trgm_idx" ON "AIOutput" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Collection_name_trgm_active_idx" ON "Collection" USING GIN ("name" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX "Tag_name_trgm_active_idx" ON "Tag" USING GIN ("name" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX "AIOutput_workspace_updated_id_idx" ON "AIOutput"("workspaceId", "updatedAt" DESC, "id" DESC);
CREATE INDEX "ChatSession_workspace_activity_id_idx" ON "ChatSession"("workspaceId", "lastActivityAt" DESC, "id" DESC);
