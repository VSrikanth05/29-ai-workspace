CREATE TABLE "ImageTranslation" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "ocrBoxes" JSONB NOT NULL,
    "originalStoragePath" TEXT NOT NULL,
    "translatedStoragePath" TEXT,
    "translatedMimeType" TEXT,
    "outputId" TEXT,
    "error" TEXT,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImageTranslation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ImageTranslation_outputId_key" UNIQUE ("outputId"),
    CONSTRAINT "ImageTranslation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageTranslation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ImageTranslation_userId_createdAt_idx" ON "ImageTranslation"("userId", "createdAt");
CREATE INDEX "ImageTranslation_workspaceId_createdAt_idx" ON "ImageTranslation"("workspaceId", "createdAt");
CREATE INDEX "ImageTranslation_workspaceId_status_idx" ON "ImageTranslation"("workspaceId", "status");
