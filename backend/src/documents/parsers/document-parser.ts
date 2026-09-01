export type DocumentFormat =
  'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'markdown' | 'txt';

export type DocumentMetadata = Record<string, string | number | boolean>;

/** The format-independent representation consumed by the document pipeline. */
export interface ParsedDocument {
  text: string;
  metadata?: DocumentMetadata;
}

/** Contract implemented by every format-specific document parser. */
export interface DocumentParser {
  readonly format: DocumentFormat;
  parse(buffer: Buffer): Promise<ParsedDocument> | ParsedDocument;
}

export function normalizeDocumentText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .split('\u0000')
    .join('')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
