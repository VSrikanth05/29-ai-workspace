import { DocumentIngestionService } from './document-ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { DocumentExtractorService } from './document-extractor.service';
import { EmbeddingsService } from '../rag/embeddings.service';
import { MetricsService } from '../infrastructure/metrics.service';

describe('DocumentIngestionService', () => {
  function createService(overrides: { extractorFails?: boolean } = {}) {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      document: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'document-1',
          originalName: 'notes.txt',
          mimeType: 'text/plain',
          storagePath: 'user/notes.txt',
        }),
        update,
      },
      documentChunk: {
        deleteMany: jest.fn().mockReturnValue({ operation: 'delete' }),
        createMany: jest.fn().mockReturnValue({ operation: 'create' }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const storage = {
      download: jest.fn().mockResolvedValue(Buffer.from('stored')),
    };
    const extractor = {
      parse: overrides.extractorFails
        ? jest.fn().mockRejectedValue(new Error('parse failed'))
        : jest.fn().mockResolvedValue({
            text: 'extracted text',
            metadata: { format: 'txt' },
          }),
    };
    const chunker = { chunkText: jest.fn().mockReturnValue(['one', 'two']) };
    const embeddings = { embedDocumentChunks: jest.fn().mockResolvedValue(2) };
    const metrics = { ingestionJobs: { inc: jest.fn() } };
    const service = new DocumentIngestionService(
      prisma as unknown as PrismaService,
      storage as unknown as SupabaseStorageService,
      extractor as unknown as DocumentExtractorService,
      chunker,
      embeddings as unknown as EmbeddingsService,
      metrics as unknown as MetricsService,
    );
    return { service, prisma, storage, extractor, embeddings, metrics, update };
  }

  it('downloads, parses, chunks, embeds, and records success', async () => {
    const context = createService();
    await context.service.process('document-1');

    expect(context.storage.download).toHaveBeenCalledWith('user/notes.txt');
    expect(context.extractor.parse).toHaveBeenCalled();
    expect(context.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(context.embeddings.embedDocumentChunks).toHaveBeenCalledWith(
      'document-1',
    );
    expect(context.metrics.ingestionJobs.inc).toHaveBeenCalledWith({
      outcome: 'processed',
    });
  });

  it('marks the document failed and rethrows for BullMQ retry', async () => {
    const context = createService({ extractorFails: true });
    await expect(context.service.process('document-1')).rejects.toThrow(
      'parse failed',
    );
    expect(context.update).toHaveBeenLastCalledWith({
      where: { id: 'document-1' },
      data: { status: 'FAILED', processingError: 'parse failed' },
    });
    expect(context.metrics.ingestionJobs.inc).toHaveBeenCalledWith({
      outcome: 'failed',
    });
  });
});
