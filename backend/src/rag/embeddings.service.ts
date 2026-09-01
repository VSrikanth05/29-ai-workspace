import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LlmGatewayService } from '../llm/llm-gateway.service';
import { EMBEDDING_DIMENSIONS } from '../llm/interfaces/llm-provider.interface';
import { toVectorLiteral } from './vector.util';
import { AppException, ErrorCode } from '../common/errors/app.exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class EmbeddingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmGateway: LlmGatewayService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Embeds every chunk belonging to a document and writes each vector via a
   * raw SQL update (Prisma Client can't bind `vector` columns directly).
   * Called right after a document finishes text-extraction + chunking.
   */
  async embedDocumentChunks(documentId: string): Promise<number> {
    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      select: { id: true, content: true },
    });

    const prepared = await this.prepareEmbeddings(chunks);

    await this.prisma.$transaction(
      prepared.map(
        ({ id, literal }) => this.prisma.$executeRaw`
          UPDATE "DocumentChunk"
          SET "embedding" = ${literal}::vector
          WHERE "id" = ${id}
        `,
      ),
    );

    return prepared.length;
  }

  /** Embeds a RAG query using exactly the same provider/model as ingestion. */
  async embedQuery(question: string): Promise<number[]> {
    return this.embed(`task: question answering | query: ${question}`);
  }

  /**
   * Rebuilds every stored chunk vector without deleting source documents.
   * All API calls finish before the transaction starts, so existing vectors
   * remain untouched if generation fails. The transaction then clears and
   * replaces every vector atomically to avoid mixing embedding spaces.
   */
  async rebuildAllEmbeddings(): Promise<number> {
    const chunks = await this.prisma.documentChunk.findMany({
      select: { id: true, content: true },
      orderBy: [{ documentId: 'asc' }, { chunkIndex: 'asc' }],
    });
    const prepared = await this.prepareEmbeddings(chunks);

    await this.prisma.$transaction([
      this.prisma.$executeRaw`UPDATE "DocumentChunk" SET "embedding" = NULL`,
      ...prepared.map(
        ({ id, literal }) => this.prisma.$executeRaw`
          UPDATE "DocumentChunk"
          SET "embedding" = ${literal}::vector
          WHERE "id" = ${id}
        `,
      ),
    ]);

    return prepared.length;
  }

  private async prepareEmbeddings(
    chunks: { id: string; content: string }[],
  ): Promise<{ id: string; literal: string }[]> {
    const prepared: { id: string; literal: string }[] = [];

    for (const chunk of chunks) {
      const embedding = await this.embed(
        `title: none | text: ${chunk.content}`,
      );
      prepared.push({ id: chunk.id, literal: toVectorLiteral(embedding) });
    }

    return prepared;
  }

  private async embed(text: string): Promise<number[]> {
    const providerKey =
      this.configService.get<string>('EMBEDDING_PROVIDER') ??
      this.configService.get<string>('LLM_PROVIDER') ??
      'gemini';
    const embedding = await this.llmGateway.embed(providerKey, text);

    if (
      embedding.length !== EMBEDDING_DIMENSIONS ||
      !embedding.every(Number.isFinite)
    ) {
      throw new AppException(
        ErrorCode.AI_PROVIDER_INVALID_RESPONSE,
        HttpStatus.BAD_GATEWAY,
        'The embedding provider returned an invalid response.',
        new Error(
          `Embedding provider "${providerKey}" returned an invalid vector with ${embedding.length} dimensions; ` +
            `DocumentChunk.embedding requires ${EMBEDDING_DIMENSIONS} finite values.`,
        ),
      );
    }

    return embedding;
  }
}
