import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';
import { DocumentExtractorService } from './document-extractor.service';
import { TextChunkerService } from './text-chunker.service';
import { EmbeddingsService } from '../rag/embeddings.service';
import { MetricsService } from '../infrastructure/metrics.service';

@Injectable()
export class DocumentIngestionService {
  private readonly logger = new Logger(DocumentIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly extractor: DocumentExtractorService,
    private readonly chunker: TextChunkerService,
    private readonly embeddings: EmbeddingsService,
    private readonly metrics: MetricsService,
  ) {}

  async process(documentId: string, suppliedBuffer?: Buffer): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      this.logger.warn(
        JSON.stringify({ event: 'ingestion_document_missing', documentId }),
      );
      return;
    }

    try {
      const buffer =
        suppliedBuffer ?? (await this.storage.download(document.storagePath));
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING', processingError: null },
      });
      const parsed = await this.extractor.parse(
        buffer,
        document.originalName,
        document.mimeType,
      );
      const extractedText = parsed.text;
      const chunks = this.chunker.chunkText(extractedText);

      await this.prisma.$transaction([
        this.prisma.document.update({
          where: { id: documentId },
          data: {
            extractedText,
            metadata: parsed.metadata ?? undefined,
            status: 'PROCESSED',
            processingError: null,
          },
        }),
        this.prisma.documentChunk.deleteMany({ where: { documentId } }),
        this.prisma.documentChunk.createMany({
          data: chunks.map((content, chunkIndex) => ({
            content,
            chunkIndex,
            documentId,
          })),
        }),
      ]);
      await this.embeddings.embedDocumentChunks(documentId);
      this.metrics.ingestionJobs.inc({ outcome: 'processed' });
      this.logger.log(
        JSON.stringify({
          event: 'document_ingestion_completed',
          documentId,
          chunks: chunks.length,
        }),
      );
    } catch (error) {
      this.metrics.ingestionJobs.inc({ outcome: 'failed' });
      const message =
        error instanceof Error ? error.message : 'Document ingestion failed';
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', processingError: message.slice(0, 500) },
      });
      throw error;
    }
  }
}
