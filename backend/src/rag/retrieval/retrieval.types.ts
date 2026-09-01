export type RetrievalMode = 'hybrid' | 'vector' | 'text';

export interface RetrievalMetadataFilter {
  documentIds?: string[];
  mimeTypes?: string[];
  createdAfter?: string | Date;
  createdBefore?: string | Date;
}

export interface RetrievalOverrides {
  mode?: RetrievalMode;
  topK?: number;
  vectorCandidates?: number;
  textCandidates?: number;
  vectorWeight?: number;
  textWeight?: number;
  minScore?: number;
  rerankEnabled?: boolean;
}

export interface RetrievalSettings {
  mode: RetrievalMode;
  topK: number;
  vectorCandidates: number;
  textCandidates: number;
  vectorWeight: number;
  textWeight: number;
  minScore: number;
  rerankEnabled: boolean;
}

export interface RetrievalRequest {
  userId: string;
  workspaceId?: string;
  query: string;
  documentId?: string;
  metadataFilter?: RetrievalMetadataFilter;
}

export type RetrievalMethod = 'vector' | 'text';

export interface RetrievalCandidate {
  id: string;
  content: string;
  documentId: string;
  originalName: string;
  chunkIndex: number;
  mimeType: string;
  documentCreatedAt: Date;
  retrievalMethods: RetrievalMethod[];
  vectorScore?: number;
  textScore?: number;
  fusionScore?: number;
  score: number;
}

export interface Retriever {
  readonly method: RetrievalMethod;
  retrieve(
    request: RetrievalRequest,
    settings: RetrievalSettings,
  ): Promise<RetrievalCandidate[]>;
}

export interface Reranker {
  rerank(query: string, candidates: RetrievalCandidate[]): RetrievalCandidate[];
}
