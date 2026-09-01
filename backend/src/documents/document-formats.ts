import { extname } from 'node:path';
import type { DocumentFormat } from './parsers/document-parser';

interface DocumentFormatDefinition {
  format: DocumentFormat;
  extensions: readonly string[];
  mimeTypes: readonly string[];
}

export const DOCUMENT_FORMATS: readonly DocumentFormatDefinition[] = [
  {
    format: 'pdf',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
  },
  {
    format: 'docx',
    extensions: ['.docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    format: 'pptx',
    extensions: ['.pptx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  {
    format: 'xlsx',
    extensions: ['.xlsx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  {
    format: 'csv',
    extensions: ['.csv'],
    mimeTypes: ['text/csv', 'application/csv'],
  },
  {
    format: 'markdown',
    extensions: ['.md', '.markdown'],
    mimeTypes: ['text/markdown', 'text/x-markdown'],
  },
  {
    format: 'txt',
    extensions: ['.txt'],
    mimeTypes: ['text/plain'],
  },
] as const;

export const SUPPORTED_EXTENSIONS = DOCUMENT_FORMATS.flatMap(
  ({ extensions }) => extensions,
);

export const SUPPORTED_MIME_TYPES = DOCUMENT_FORMATS.flatMap(
  ({ mimeTypes }) => mimeTypes,
);

const GENERIC_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
]);

/**
 * Resolve and validate a format from the filename and browser-provided MIME.
 * Browsers sometimes use a generic MIME, so a known extension remains enough;
 * a conflicting, format-specific MIME is rejected instead of being guessed.
 */
export function resolveDocumentFormat(
  originalName: string,
  mimeType: string,
): DocumentFormat | undefined {
  const extension = extname(originalName).toLowerCase();
  const normalizedMime = mimeType.toLowerCase().split(';', 1)[0].trim();
  const byExtension = DOCUMENT_FORMATS.find(({ extensions }) =>
    extensions.includes(extension),
  );

  if (!byExtension) return undefined;
  if (GENERIC_MIME_TYPES.has(normalizedMime)) return byExtension.format;

  // Markdown files are commonly reported as text/plain by browsers and OSes.
  if (byExtension.format === 'markdown' && normalizedMime === 'text/plain') {
    return byExtension.format;
  }

  return byExtension.mimeTypes.includes(normalizedMime)
    ? byExtension.format
    : undefined;
}

/** Used by the backwards-compatible MIME-only extractor API. */
export function resolveDocumentFormatByMime(
  mimeType: string,
): DocumentFormat | undefined {
  const normalizedMime = mimeType.toLowerCase().split(';', 1)[0].trim();
  return DOCUMENT_FORMATS.find(({ mimeTypes }) =>
    mimeTypes.includes(normalizedMime),
  )?.format;
}
