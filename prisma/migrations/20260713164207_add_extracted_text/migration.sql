-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "extractedText" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
