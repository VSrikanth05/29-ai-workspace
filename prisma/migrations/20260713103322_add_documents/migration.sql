/*
  Warnings:

  - You are about to drop the column `fileSize` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `fileType` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `storagePath` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedAt` on the `Document` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- Preserve existing Document data while migrating to the new schema

-- Rename existing columns
ALTER TABLE "public"."Document"
RENAME COLUMN "fileType" TO "mimeType";

ALTER TABLE "public"."Document"
RENAME COLUMN "fileSize" TO "size";

ALTER TABLE "public"."Document"
RENAME COLUMN "storagePath" TO "filePath";

ALTER TABLE "public"."Document"
RENAME COLUMN "uploadedAt" TO "createdAt";

-- Rename title to originalName
ALTER TABLE "public"."Document"
RENAME COLUMN "title" TO "originalName";

-- Add new columns safely
ALTER TABLE "public"."Document"
ADD COLUMN "fileName" TEXT;

ALTER TABLE "public"."Document"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'UPLOADED';

ALTER TABLE "public"."Document"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate fileName for existing documents
UPDATE "public"."Document"
SET "fileName" = "originalName"
WHERE "fileName" IS NULL;

-- Make fileName required after existing rows are updated
ALTER TABLE "public"."Document"
ALTER COLUMN "fileName" SET NOT NULL;

-- Add updatedAt safely to existing User rows
ALTER TABLE "public"."User"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;