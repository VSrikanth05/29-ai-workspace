import { HeuristicRerankerService } from './heuristic-reranker.service';
import type { RetrievalCandidate } from './retrieval.types';

function candidate(
  id: string,
  content: string,
  chunkIndex: number,
): RetrievalCandidate {
  return {
    id,
    content,
    chunkIndex,
    documentId: 'document-1',
    originalName: 'source.txt',
    mimeType: 'text/plain',
    documentCreatedAt: new Date('2026-07-01'),
    retrievalMethods: ['vector'],
    fusionScore: 0.01,
    score: 0,
  };
}

describe('HeuristicRerankerService', () => {
  it('promotes exact and token-overlap matches deterministically', () => {
    const reranked = new HeuristicRerankerService().rerank(
      'quarterly revenue',
      [
        candidate('weak', 'General company introduction', 0),
        candidate('strong', 'Quarterly revenue increased by 20 percent', 4),
      ],
    );

    expect(reranked.map(({ id }) => id)).toEqual(['strong', 'weak']);
    expect(reranked[0].score).toBeGreaterThan(reranked[1].score);
  });

  it('does not mutate input candidates', () => {
    const input = [candidate('one', 'matching content', 0)];
    const output = new HeuristicRerankerService().rerank('matching', input);

    expect(input[0].score).toBe(0);
    expect(output[0]).not.toBe(input[0]);
  });
});
