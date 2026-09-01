import { Injectable } from '@nestjs/common';
import { Reranker, RetrievalCandidate } from './retrieval.types';

@Injectable()
export class HeuristicRerankerService implements Reranker {
  rerank(
    query: string,
    candidates: RetrievalCandidate[],
  ): RetrievalCandidate[] {
    if (!candidates.length) return [];
    const queryTokens = tokenize(query);
    const maximumFusion = Math.max(
      ...candidates.map((candidate) => candidate.fusionScore ?? 0),
      1e-9,
    );
    const normalizedQuery = query.trim().toLowerCase();

    return candidates
      .map((candidate) => {
        const content = candidate.content.toLowerCase();
        const contentTokens = new Set(tokenize(content));
        const overlap = queryTokens.length
          ? queryTokens.filter((token) => contentTokens.has(token)).length /
            queryTokens.length
          : 0;
        const exactPhrase =
          normalizedQuery.length >= 4 && content.includes(normalizedQuery)
            ? 1
            : 0;
        const earlyChunk = 1 / (candidate.chunkIndex + 1);
        const fusion = (candidate.fusionScore ?? 0) / maximumFusion;
        const score =
          fusion * 0.7 +
          overlap * 0.22 +
          exactPhrase * 0.06 +
          earlyChunk * 0.02;

        return { ...candidate, score: Math.min(1, score) };
      })
      .sort((left, right) =>
        right.score === left.score
          ? left.chunkIndex - right.chunkIndex
          : right.score - left.score,
      );
  }
}

function tokenize(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
}
