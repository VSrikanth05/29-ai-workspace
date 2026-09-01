CREATE TYPE "MediaAssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO');

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "type" "MediaAssetType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "prompt" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "providerJobId" TEXT,
    "mimeType" TEXT,
    "storagePath" TEXT,
    "sourceUrl" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_userId_createdAt_idx" ON "MediaAsset"("userId", "createdAt");
CREATE INDEX "MediaAsset_workspaceId_createdAt_idx" ON "MediaAsset"("workspaceId", "createdAt");
CREATE INDEX "MediaAsset_workspaceId_status_idx" ON "MediaAsset"("workspaceId", "status");

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
