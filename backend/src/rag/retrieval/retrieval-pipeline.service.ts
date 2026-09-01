import { Injectable } from '@nestjs/common';
import { HeuristicRerankerService } from './heuristic-reranker.service';
import { RetrievalSettingsService } from './retrieval-settings.service';
import { TextSearchRetrieverService } from './text-search-retriever.service';
import {
  RetrievalCandidate,
  RetrievalOverrides,
  RetrievalRequest,
  RetrievalSettings,
  Retriever,
} from './retrieval.types';
import { VectorRetrieverService } from './vector-retriever.service';

const RECIPROCAL_RANK_CONSTANT = 60;

@Injectable()
export class RetrievalPipelineService {
  constructor(
    private readonly vectorRetriever: VectorRetrieverService,
    private readonly textRetriever: TextSearchRetrieverService,
    private readonly reranker: HeuristicRerankerService,
    private readonly settingsService: RetrievalSettingsService,
  ) {}

  async retrieve(
    request: RetrievalRequest,
    overrides: RetrievalOverrides = {},
  ): Promise<RetrievalCandidate[]> {
    const settings = this.settingsService.resolve(overrides);
    const retrievers = this.enabledRetrievers(settings);
    const results = await Promise.allSettled(
      retrievers.map((retriever) => retriever.retrieve(request, settings)),
    );
    const successful = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );

    if (!successful.length) {
      const failure = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      throw (
        failure?.reason ?? new Error('No retrieval strategy was available.')
      );
    }

    const fused = this.fuse(retrievers, results, settings);
    const ranked = settings.rerankEnabled
      ? this.reranker.rerank(request.query, fused)
      : this.normalizeFusionScores(fused);

    return ranked
      .filter((candidate) => candidate.score >= settings.minScore)
      .slice(0, settings.topK);
  }

  private enabledRetrievers(settings: RetrievalSettings): Retriever[] {
    if (settings.mode === 'vector') return [this.vectorRetriever];
    if (settings.mode === 'text') return [this.textRetriever];
    return [this.vectorRetriever, this.textRetriever];
  }

  private fuse(
    retrievers: Retriever[],
    results: PromiseSettledResult<RetrievalCandidate[]>[],
    settings: RetrievalSettings,
  ): RetrievalCandidate[] {
    const merged = new Map<string, RetrievalCandidate>();

    results.forEach((result, resultIndex) => {
      if (result.status === 'rejected') return;
      const method = retrievers[resultIndex].method;
      const weight =
        method === 'vector' ? settings.vectorWeight : settings.textWeight;

      result.value.forEach((candidate, rank) => {
        const existing = merged.get(candidate.id);
        const contribution = weight / (RECIPROCAL_RANK_CONSTANT + rank + 1);
        merged.set(candidate.id, {
          ...(existing ?? candidate),
          vectorScore: candidate.vectorScore ?? existing?.vectorScore,
          textScore: candidate.textScore ?? existing?.textScore,
          retrievalMethods: Array.from(
            new Set([...(existing?.retrievalMethods ?? []), method]),
          ),
          fusionScore: (existing?.fusionScore ?? 0) + contribution,
          score: 0,
        });
      });
    });

    return [...merged.values()];
  }

  private normalizeFusionScores(
    candidates: RetrievalCandidate[],
  ): RetrievalCandidate[] {
    const maximum = Math.max(
      ...candidates.map((candidate) => candidate.fusionScore ?? 0),
      1e-9,
    );
    return candidates
      .map((candidate) => ({
        ...candidate,
        score: (candidate.fusionScore ?? 0) / maximum,
      }))
      .sort((left, right) => right.score - left.score);
  }
}
