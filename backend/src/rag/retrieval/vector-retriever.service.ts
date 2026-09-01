import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings.service';
import { toVectorLiteral } from '../vector.util';
import { buildMetadataFilterSql } from './metadata-filter.sql';
import {
  RetrievalCandidate,
  RetrievalRequest,
  RetrievalSettings,
  Retriever,
} from './retrieval.types';

interface VectorRow {
  id: string;
  content: string;
  documentId: string;
  originalName: string;
  chunkIndex: number;
  mimeType: string;
  documentCreatedAt: Date;
  distance: number;
}

@Injectable()
export class VectorRetrieverService implements Retriever {
  readonly method = 'vector' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async retrieve(
    request: RetrievalRequest,
    settings: RetrievalSettings,
  ): Promise<RetrievalCandidate[]> {
    const embedding = await this.embeddings.embedQuery(request.query);
    const literal = toVectorLiteral(embedding);
    const filters = buildMetadataFilterSql(request);
    const rows = await this.prisma.$queryRaw<VectorRow[]>(Prisma.sql`
      SELECT c."id", c."content", c."documentId", c."chunkIndex",
             d."originalName", d."mimeType", d."createdAt" AS "documentCreatedAt",
             (c."embedding" <=> ${literal}::vector)::double precision AS distance
      FROM "DocumentChunk" c
      JOIN "Document" d ON d."id" = c."documentId"
      WHERE ${filters} AND c."embedding" IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${settings.vectorCandidates}
    `);

    return rows.map((row) => ({
      ...row,
      distance: undefined,
      retrievalMethods: [this.method],
      vectorScore: Math.max(0, 1 - Number(row.distance)),
      score: 0,
    }));
  }
}
