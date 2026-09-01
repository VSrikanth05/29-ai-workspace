ALTER TABLE "ChatSession"
  ADD COLUMN "workspaceId" TEXT,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  ADD COLUMN "topP" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "maxTokens" INTEGER NOT NULL DEFAULT 1024,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "streamStatus" TEXT NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ChatSession" AS session
SET "workspaceId" = document."workspaceId",
    "lastActivityAt" = session."updatedAt"
FROM "Document" AS document
WHERE session."documentId" = document."id";

ALTER TABLE "ChatSession"
  ADD CONSTRAINT "ChatSession_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ChatSession_workspaceId_lastActivityAt_idx"
  ON "ChatSession"("workspaceId", "lastActivityAt");

ALTER TABLE "ChatMessage"
  ADD COLUMN "finishReason" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "ModelUsage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "latencyMs" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "errorCode" TEXT,
  "requestId" TEXT,
  "streamed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModelUsage_conversationId_fkey" FOREIGN KEY ("conversationId")
    REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ModelUsage_conversationId_createdAt_idx" ON "ModelUsage"("conversationId", "createdAt");
CREATE INDEX "ModelUsage_workspaceId_createdAt_idx" ON "ModelUsage"("workspaceId", "createdAt");
CREATE INDEX "ModelUsage_provider_model_createdAt_idx" ON "ModelUsage"("provider", "model", "createdAt");
