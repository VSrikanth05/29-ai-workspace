import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmbeddingsService } from './embeddings.service';

async function rebuildEmbeddings() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const embeddings = app.get(EmbeddingsService);
    const count = await embeddings.rebuildAllEmbeddings();
    console.log(`Rebuilt ${count} document chunk embeddings.`);
  } finally {
    await app.close();
  }
}

rebuildEmbeddings().catch((error: unknown) => {
  console.error(
    `Embedding rebuild failed; existing vectors were not replaced: ${(error as Error).message}`,
  );
  process.exitCode = 1;
});
