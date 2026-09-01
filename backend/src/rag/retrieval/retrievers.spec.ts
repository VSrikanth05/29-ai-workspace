import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings.service';
import { TextSearchRetrieverService } from './text-search-retriever.service';
import type { RetrievalSettings } from './retrieval.types';
import { VectorRetrieverService } from './vector-retriever.service';

const settings: RetrievalSettings = {
  mode: 'hybrid',
  topK: 5,
  vectorCandidates: 10,
  textCandidates: 12,
  vectorWeight: 0.65,
  textWeight: 0.35,
  minScore: 0,
  rerankEnabled: true,
};

const row = {
  id: 'chunk-1',
  content: 'Grounded content',
  documentId: 'document-1',
  originalName: 'source.pdf',
  chunkIndex: 3,
  mimeType: 'application/pdf',
  documentCreatedAt: new Date('2026-07-01'),
};

describe('retrievers', () => {
  it('vector retriever embeds the query and returns scored candidates', async () => {
    let statement: Prisma.Sql | undefined;
    const prisma = {
      $queryRaw: jest.fn((sql: Prisma.Sql) => {
        statement = sql;
        return Promise.resolve([{ ...row, distance: 0.2 }]);
      }),
    };
    const embeddings = {
      embedQuery: jest.fn().mockResolvedValue(Array(1536).fill(0.1)),
    };
    const retriever = new VectorRetrieverService(
      prisma as unknown as PrismaService,
      embeddings as unknown as EmbeddingsService,
    );

    const result = await retriever.retrieve(
      { userId: 'user-1', query: 'revenue' },
      settings,
    );

    expect(embeddings.embedQuery).toHaveBeenCalledWith('revenue');
    expect(statement?.strings.join('')).toContain('c."embedding" <=>');
    expect(statement?.values).toContain('user-1');
    expect(result[0]).toMatchObject({
      id: 'chunk-1',
      vectorScore: 0.8,
      retrievalMethods: ['vector'],
    });
  });

  it('text retriever uses the indexed search vector and metadata filters', async () => {
    let statement: Prisma.Sql | undefined;
    const prisma = {
      $queryRaw: jest.fn((sql: Prisma.Sql) => {
        statement = sql;
        return Promise.resolve([{ ...row, textScore: 0.7 }]);
      }),
    };
    const retriever = new TextSearchRetrieverService(
      prisma as unknown as PrismaService,
    );

    const result = await retriever.retrieve(
      {
        userId: 'user-1',
        query: 'quarterly revenue',
        metadataFilter: { mimeTypes: ['application/pdf'] },
      },
      settings,
    );

    expect(statement?.strings.join('')).toContain('c."searchVector" @@ query');
    expect(statement?.values).toEqual(
      expect.arrayContaining([
        'user-1',
        'application/pdf',
        'quarterly revenue',
        settings.textCandidates,
      ]),
    );
    expect(result[0]).toMatchObject({
      textScore: 0.7,
      retrievalMethods: ['text'],
    });
  });

  it('text retriever skips PostgreSQL for a blank query', async () => {
    const prisma = { $queryRaw: jest.fn() };
    const retriever = new TextSearchRetrieverService(
      prisma as unknown as PrismaService,
    );

    await expect(
      retriever.retrieve({ userId: 'user-1', query: '  ' }, settings),
    ).resolves.toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
