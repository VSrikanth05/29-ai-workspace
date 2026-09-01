import { ConfigService } from '@nestjs/config';
import { RetrievalSettingsService } from './retrieval-settings.service';

describe('RetrievalSettingsService', () => {
  it('uses safe hybrid defaults when configuration is absent', () => {
    const service = new RetrievalSettingsService({
      get: jest.fn(),
    } as unknown as ConfigService);

    expect(service.resolve()).toEqual({
      mode: 'hybrid',
      topK: 5,
      vectorCandidates: 15,
      textCandidates: 15,
      vectorWeight: 0.65,
      textWeight: 0.35,
      minScore: 0,
      rerankEnabled: true,
    });
  });

  it('supports per-request overrides and clamps unsafe values', () => {
    const service = new RetrievalSettingsService({
      get: jest.fn(),
    } as unknown as ConfigService);

    expect(
      service.resolve({
        mode: 'text',
        topK: 100,
        textCandidates: 500,
        vectorWeight: -1,
        minScore: 2,
        rerankEnabled: false,
      }),
    ).toMatchObject({
      mode: 'text',
      topK: 20,
      textCandidates: 100,
      vectorWeight: 0,
      minScore: 1,
      rerankEnabled: false,
    });
  });

  it('reads retrieval settings from environment configuration', () => {
    const values: Record<string, string> = {
      RAG_RETRIEVAL_MODE: 'vector',
      RAG_TOP_K: '8',
      RAG_VECTOR_CANDIDATES: '24',
      RAG_RERANK_ENABLED: 'false',
    };
    const service = new RetrievalSettingsService({
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);

    expect(service.resolve()).toMatchObject({
      mode: 'vector',
      topK: 8,
      vectorCandidates: 24,
      rerankEnabled: false,
    });
  });
});
