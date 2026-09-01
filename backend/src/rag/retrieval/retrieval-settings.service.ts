import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RetrievalMode,
  RetrievalOverrides,
  RetrievalSettings,
} from './retrieval.types';

const DEFAULT_TOP_K = 5;

@Injectable()
export class RetrievalSettingsService {
  constructor(private readonly config: ConfigService) {}

  resolve(overrides: RetrievalOverrides = {}): RetrievalSettings {
    const topK = this.integer(
      overrides.topK,
      'RAG_TOP_K',
      DEFAULT_TOP_K,
      1,
      20,
    );

    return {
      mode: this.mode(overrides.mode ?? this.config.get('RAG_RETRIEVAL_MODE')),
      topK,
      vectorCandidates: this.integer(
        overrides.vectorCandidates,
        'RAG_VECTOR_CANDIDATES',
        Math.max(topK * 3, 10),
        topK,
        100,
      ),
      textCandidates: this.integer(
        overrides.textCandidates,
        'RAG_TEXT_CANDIDATES',
        Math.max(topK * 3, 10),
        topK,
        100,
      ),
      vectorWeight: this.number(
        overrides.vectorWeight,
        'RAG_VECTOR_WEIGHT',
        0.65,
        0,
        1,
      ),
      textWeight: this.number(
        overrides.textWeight,
        'RAG_TEXT_WEIGHT',
        0.35,
        0,
        1,
      ),
      minScore: this.number(overrides.minScore, 'RAG_MIN_SCORE', 0, 0, 1),
      rerankEnabled:
        overrides.rerankEnabled ??
        this.boolean(this.config.get('RAG_RERANK_ENABLED'), true),
    };
  }

  private mode(value: unknown): RetrievalMode {
    return value === 'vector' || value === 'text' || value === 'hybrid'
      ? value
      : 'hybrid';
  }

  private integer(
    override: number | undefined,
    key: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    return Math.round(
      this.clamp(
        override ?? Number(this.config.get(key)),
        fallback,
        minimum,
        maximum,
      ),
    );
  }

  private number(
    override: number | undefined,
    key: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    return this.clamp(
      override ?? Number(this.config.get(key)),
      fallback,
      minimum,
      maximum,
    );
  }

  private clamp(
    value: number,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const resolved = Number.isFinite(value) ? value : fallback;
    return Math.min(maximum, Math.max(minimum, resolved));
  }

  private boolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    return fallback;
  }
}
