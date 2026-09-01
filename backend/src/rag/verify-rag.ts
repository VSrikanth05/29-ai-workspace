import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ChatService } from '../chat/chat.service';
import { DiagramService } from '../diagram/diagram.service';
import { DocumentsService } from '../documents/documents.service';
import { EMBEDDING_DIMENSIONS } from '../llm/interfaces/llm-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { SummaryService } from '../summary/summary.service';

async function verifyRag() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const documents = app.get(DocumentsService);
  const chat = app.get(ChatService);
  const summaries = app.get(SummaryService);
  const diagrams = app.get(DiagramService);
  const runId = randomUUID();
  const userId = `rag-verification-${runId}`;
  let documentId = '';

  try {
    await prisma.profile.create({
      data: {
        id: userId,
        name: 'RAG verification',
        email: `${userId}@example.invalid`,
      },
    });

    const content = Buffer.from(
      'Project Northstar uses the launch codename Blue Kestrel. ' +
        'Its verified release date is 17 September 2026. ' +
        'The project owner is Maya Rao.',
    );
    const file = {
      fieldname: 'file',
      originalname: `rag-verification-${runId}.txt`,
      encoding: '7bit',
      mimetype: 'text/plain',
      size: content.length,
      buffer: content,
    } as Express.Multer.File;
    const document = await documents.createDocument(file, userId);
    if (!document) throw new Error('Upload returned no document.');
    documentId = document.id;

    const dimensions = await prisma.$queryRaw<
      { dimensions: number; embedded: boolean }[]
    >`
      SELECT vector_dims("embedding")::int AS dimensions,
             ("embedding" IS NOT NULL) AS embedded
      FROM "DocumentChunk"
      WHERE "documentId" = ${documentId}
    `;
    if (
      dimensions.length === 0 ||
      dimensions.some(
        (row) => !row.embedded || row.dimensions !== EMBEDDING_DIMENSIONS,
      )
    ) {
      throw new Error(
        `Uploaded document has invalid vectors: ${JSON.stringify(dimensions)}`,
      );
    }

    const session = await chat.createSession(
      userId,
      documentId,
      'RAG verification',
    );
    const chatResult = await chat.sendMessage(
      userId,
      session.id,
      'What is the launch codename and verified release date?',
    );
    if (chatResult.message.llmProvider !== 'gemini') {
      throw new Error(
        `Chat used ${chatResult.message.llmProvider}, not Gemini.`,
      );
    }

    const summary = await summaries.generateSummary(userId, documentId);
    if (summary.llmProvider !== 'gemini') {
      throw new Error(`Summary used ${summary.llmProvider}, not Gemini.`);
    }

    const diagram = await diagrams.generateDiagram(userId, documentId);
    if (diagram.llmProvider !== 'gemini') {
      throw new Error(`Diagram used ${diagram.llmProvider}, not Gemini.`);
    }

    console.log(
      JSON.stringify(
        {
          upload: { status: document.status, chunks: dimensions.length },
          embeddings: {
            model: process.env.GEMINI_EMBEDDING_MODEL,
            dimensions: EMBEDDING_DIMENSIONS,
          },
          chat: {
            provider: chatResult.message.llmProvider,
            model: chatResult.message.llmModel,
            answer: chatResult.message.content,
            sources: chatResult.sources.length,
          },
          summary: { provider: summary.llmProvider, model: summary.llmModel },
          diagram: { provider: diagram.llmProvider, model: diagram.llmModel },
        },
        null,
        2,
      ),
    );
  } finally {
    if (documentId) {
      await documents.deleteDocument(userId, documentId).catch(() => undefined);
    }
    await prisma.profile
      .delete({ where: { id: userId } })
      .catch(() => undefined);
    await app.close();
  }
}

verifyRag().catch((error: unknown) => {
  console.error(`RAG verification failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
