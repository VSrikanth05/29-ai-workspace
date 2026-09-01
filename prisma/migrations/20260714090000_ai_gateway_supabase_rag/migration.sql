-- Enable pgvector (available on Supabase Postgres by default)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ Switch local auth (User+password) to a Profile synced from Supabase Auth ============
-- The table is renamed in place so existing Document rows keep their FK intact.
-- NOTE: existing local accounts cannot map to a Supabase Auth user id, so this is a
-- breaking change for auth: users will need to re-register through Supabase Auth.
ALTER TABLE "public"."User" RENAME TO "Profile";
ALTER TABLE "public"."Profile" DROP COLUMN "password";
ALTER TABLE "public"."Profile" RENAME CONSTRAINT "User_pkey" TO "Profile_pkey";
ALTER INDEX IF EXISTS "public"."User_email_key" RENAME TO "Profile_email_key";

-- ============ Documents: move from local disk paths to Supabase Storage object keys ============
ALTER TABLE "public"."Document" RENAME COLUMN "filePath" TO "storagePath";
ALTER TABLE "public"."Document" ADD COLUMN "storageBucket" TEXT NOT NULL DEFAULT 'documents';

-- ============ Vector embeddings on chunks (for RAG similarity search) ============
ALTER TABLE "public"."DocumentChunk" ADD COLUMN "embedding" vector(1536);

-- ============ Document summaries ============
CREATE TABLE "public"."DocumentSummary" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSummary_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentSummary_documentId_idx" ON "public"."DocumentSummary"("documentId");
ALTER TABLE "public"."DocumentSummary" ADD CONSTRAINT "DocumentSummary_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Generated diagrams ============
CREATE TABLE "public"."DocumentDiagram" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "diagramType" TEXT NOT NULL DEFAULT 'flowchart',
    "mermaidCode" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDiagram_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentDiagram_documentId_idx" ON "public"."DocumentDiagram"("documentId");
ALTER TABLE "public"."DocumentDiagram" ADD CONSTRAINT "DocumentDiagram_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Chat sessions & messages ============
CREATE TABLE "public"."ChatSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatSession_userId_idx" ON "public"."ChatSession"("userId");
CREATE INDEX "ChatSession_documentId_idx" ON "public"."ChatSession"("documentId");
ALTER TABLE "public"."ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ChatSession" ADD CONSTRAINT "ChatSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatMessage_sessionId_idx" ON "public"."ChatMessage"("sessionId");
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ LLM gateway catalog ============
CREATE TABLE "public"."LlmConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LlmConfig_provider_key" ON "public"."LlmConfig"("provider");
