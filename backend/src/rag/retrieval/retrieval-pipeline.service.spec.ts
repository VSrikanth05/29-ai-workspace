import { RetrievalPipelineService } from './retrieval-pipeline.service';
import { RetrievalSettingsService } from './retrieval-settings.service';
import { TextSearchRetrieverService } from './text-search-retriever.service';
import type { RetrievalCandidate, RetrievalSettings } from './retrieval.types';
import { VectorRetrieverService } from './vector-retriever.service';

const settings: RetrievalSettings = {
  mode: 'hybrid',
  topK: 5,
  vectorCandidates: 10,
  textCandidates: 10,
  vectorWeight: 0.65,
  textWeight: 0.35,
  minScore: 0,
  rerankEnabled: true,
};

function candidate(id: string, method: 'vector' | 'text'): RetrievalCandidate {
  return {
    id,
    content: `${id} content`,
    documentId: 'document-1',
    originalName: 'source.txt',
    chunkIndex: 0,
    mimeType: 'text/plain',
    documentCreatedAt: new Date('2026-07-01'),
    retrievalMethods: [method],
    score: 0,
  };
}

function createPipeline(
  vector: object,
  text: object,
  resolvedSettings: RetrievalSettings = settings,
) {
  const reranker = {
    rerank: jest.fn((_query: string, candidates: RetrievalCandidate[]) =>
      candidates
        .map((item) => ({ ...item, score: item.fusionScore ?? 0 }))
        .sort((left, right) => right.score - left.score),
    ),
  };
  const settingsService = {
    resolve: jest.fn().mockReturnValue(resolvedSettings),
  };
  return {
    pipeline: new RetrievalPipelineService(
      vector as VectorRetrieverService,
      text as TextSearchRetrieverService,
      reranker,
      settingsService as unknown as RetrievalSettingsService,
    ),
    reranker,
    settingsService,
  };
}

describe('RetrievalPipelineService', () => {
  const request = { userId: 'user-1', query: 'question' };

  it('fuses and deduplicates vector and text candidates', async () => {
    const vector = {
      method: 'vector',
      retrieve: jest
        .fn()
        .mockResolvedValue([
          candidate('shared', 'vector'),
          candidate('v', 'vector'),
        ]),
    };
    const text = {
      method: 'text',
      retrieve: jest
        .fn()
        .mockResolvedValue([
          candidate('shared', 'text'),
          candidate('t', 'text'),
        ]),
    };
    const { pipeline, reranker } = createPipeline(vector, text);

    const result = await pipeline.retrieve(request);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 'shared',
      retrievalMethods: ['vector', 'text'],
    });
    expect(reranker.rerank).toHaveBeenCalledTimes(1);
  });

  it('degrades to the successful retriever when one strategy fails', async () => {
    const vector = {
      method: 'vector',
      retrieve: jest.fn().mockRejectedValue(new Error('embedding unavailable')),
    };
    const text = {
      method: 'text',
      retrieve: jest.fn().mockResolvedValue([candidate('text-only', 'text')]),
    };
    const { pipeline } = createPipeline(vector, text);

    await expect(pipeline.retrieve(request)).resolves.toMatchObject([
      { id: 'text-only', retrievalMethods: ['text'] },
    ]);
  });

  it('fails only when every enabled retrieval strategy fails', async () => {
    const vector = {
      method: 'vector',
      retrieve: jest.fn().mockRejectedValue(new Error('vector failed')),
    };
    const text = {
      method: 'text',
      retrieve: jest.fn().mockRejectedValue(new Error('text failed')),
    };
    const { pipeline } = createPipeline(vector, text);

    await expect(pipeline.retrieve(request)).rejects.toThrow('vector failed');
  });

  it('honors text-only mode and request settings', async () => {
    const textOnly = { ...settings, mode: 'text' as const, topK: 1 };
    const vector = { method: 'vector', retrieve: jest.fn() };
    const text = {
      method: 'text',
      retrieve: jest
        .fn()
        .mockResolvedValue([
          candidate('one', 'text'),
          candidate('two', 'text'),
        ]),
    };
    const { pipeline, settingsService } = createPipeline(
      vector,
      text,
      textOnly,
    );

    const result = await pipeline.retrieve(request, { mode: 'text', topK: 1 });

    expect(vector.retrieve).not.toHaveBeenCalled();
    expect(text.retrieve).toHaveBeenCalledTimes(1);
    expect(settingsService.resolve).toHaveBeenCalledWith({
      mode: 'text',
      topK: 1,
    });
    expect(result).toHaveLength(1);
  });
});
