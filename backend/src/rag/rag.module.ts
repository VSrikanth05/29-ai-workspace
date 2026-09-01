import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '../llm/llm.module';
import { EmbeddingsService } from './embeddings.service';
import { RagService } from './rag.service';
import { HeuristicRerankerService } from './retrieval/heuristic-reranker.service';
import { RetrievalPipelineService } from './retrieval/retrieval-pipeline.service';
import { RetrievalSettingsService } from './retrieval/retrieval-settings.service';
import { TextSearchRetrieverService } from './retrieval/text-search-retriever.service';
import { VectorRetrieverService } from './retrieval/vector-retriever.service';

@Module({
  imports: [PrismaModule, LlmModule],
  providers: [
    EmbeddingsService,
    VectorRetrieverService,
    TextSearchRetrieverService,
    HeuristicRerankerService,
    RetrievalSettingsService,
    RetrievalPipelineService,
    RagService,
  ],
  exports: [EmbeddingsService, RagService],
})
export class RagModule {}
