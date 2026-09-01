CREATE TYPE "AIOutputType" AS ENUM ('SUMMARY', 'MIND_MAP', 'TRANSLATION', 'REPORT', 'KEY_POINTS', 'GLOSSARY');

CREATE TABLE "AIOutput" (
  "id" TEXT NOT NULL,
  "type" "AIOutputType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "metadata" JSONB,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIOutput_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AIOutput_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIOutput_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIOutput_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AIOutputSource" (
  "outputId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  CONSTRAINT "AIOutputSource_pkey" PRIMARY KEY ("outputId", "sourceId"),
  CONSTRAINT "AIOutputSource_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "AIOutput"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIOutputSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AIOutput_userId_createdAt_idx" ON "AIOutput"("userId", "createdAt");
CREATE INDEX "AIOutput_workspaceId_createdAt_idx" ON "AIOutput"("workspaceId", "createdAt");
CREATE INDEX "AIOutput_conversationId_createdAt_idx" ON "AIOutput"("conversationId", "createdAt");
CREATE INDEX "AIOutput_type_createdAt_idx" ON "AIOutput"("type", "createdAt");
CREATE INDEX "AIOutputSource_sourceId_idx" ON "AIOutputSource"("sourceId");
