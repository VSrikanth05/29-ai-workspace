-- PostgreSQL full-text search index used alongside pgvector retrieval.
ALTER TABLE "public"."DocumentChunk"
ADD COLUMN "searchVector" tsvector
GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", ''))) STORED;

CREATE INDEX "DocumentChunk_searchVector_idx"
ON "public"."DocumentChunk" USING GIN ("searchVector");
