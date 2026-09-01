import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMetadataFilterSql } from './metadata-filter.sql';
import {
  RetrievalCandidate,
  RetrievalRequest,
  RetrievalSettings,
  Retriever,
} from './retrieval.types';

interface TextSearchRow {
  id: string;
  content: string;
  documentId: string;
  originalName: string;
  chunkIndex: number;
  mimeType: string;
  documentCreatedAt: Date;
  textScore: number;
}

@Injectable()
export class TextSearchRetrieverService implements Retriever {
  readonly method = 'text' as const;

  constructor(private readonly prisma: PrismaService) {}

  async retrieve(
    request: RetrievalRequest,
    settings: RetrievalSettings,
  ): Promise<RetrievalCandidate[]> {
    if (!request.query.trim()) return [];
    const filters = buildMetadataFilterSql(request);
    const rows = await this.prisma.$queryRaw<TextSearchRow[]>(Prisma.sql`
      SELECT c."id", c."content", c."documentId", c."chunkIndex",
             d."originalName", d."mimeType", d."createdAt" AS "documentCreatedAt",
             ts_rank_cd(c."searchVector", query)::double precision AS "textScore"
      FROM "DocumentChunk" c
      JOIN "Document" d ON d."id" = c."documentId",
           websearch_to_tsquery('english', ${request.query}) query
      WHERE ${filters} AND c."searchVector" @@ query
      ORDER BY "textScore" DESC
      LIMIT ${settings.textCandidates}
    `);

    return rows.map((row) => ({
      ...row,
      textScore: Number(row.textScore),
      retrievalMethods: [this.method],
      score: 0,
    }));
  }
}
