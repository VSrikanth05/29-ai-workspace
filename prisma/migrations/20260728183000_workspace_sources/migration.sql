CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMember" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId")
);

ALTER TABLE "Document"
  ADD COLUMN "workspaceId" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "checksum" VARCHAR(64),
  ADD COLUMN "processingError" TEXT;

INSERT INTO "Workspace" ("id", "name", "ownerId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       COALESCE(NULLIF(TRIM(p."name"), ''), 'Personal') || '''s Workspace',
       p."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Profile" p;

INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role")
SELECT w."id", w."ownerId", 'OWNER'::"WorkspaceRole" FROM "Workspace" w;

UPDATE "Document" d
SET "workspaceId" = w."id"
FROM "Workspace" w
WHERE w."ownerId" = d."userId";

ALTER TABLE "Document" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE INDEX "Document_workspaceId_createdAt_idx" ON "Document"("workspaceId", "createdAt");
CREATE INDEX "Document_workspaceId_status_idx" ON "Document"("workspaceId", "status");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
