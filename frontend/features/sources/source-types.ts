export type Workspace = {
  id: string;
  name: string;
  members: { role: 'OWNER' | 'EDITOR' | 'VIEWER' }[];
  _count: { documents: number; members: number };
};

export type Source = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  processingError?: string | null;
  createdAt: string;
};

export type SourcePage = { items: Source[]; total: number; nextCursor: string | null };
export type UploadItem = { id: string; file: File; progress: number; state: 'queued' | 'uploading' | 'failed'; error?: string };
