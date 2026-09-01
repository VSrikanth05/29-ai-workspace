import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PdfExtractorService } from './extractors/pdf-extractor.service';
import { DocxExtractorService } from './extractors/docx-extractor.service';
import { XlsxExtractorService } from './extractors/xlsx-extractor.service';
import { PptxExtractorService } from './extractors/pptx-extractor.service';
import { CsvParserService } from './parsers/csv-parser.service';
import { MarkdownParserService } from './parsers/markdown-parser.service';
import { TxtParserService } from './parsers/txt-parser.service';
import {
  DocumentParser,
  ParsedDocument,
  normalizeDocumentText,
} from './parsers/document-parser';
import {
  resolveDocumentFormat,
  resolveDocumentFormatByMime,
} from './document-formats';

/**
 * Single entry point the DocumentsService calls; dispatches to the right
 * format-specific extractor based on mimetype so the rest of the pipeline
 * (chunking, embeddings, RAG, summaries, diagrams) never has to care about
 * the original file format.
 */
@Injectable()
export class DocumentExtractorService {
  constructor(
    private readonly pdfExtractor: PdfExtractorService,
    private readonly docxExtractor: DocxExtractorService,
    private readonly xlsxExtractor: XlsxExtractorService,
    private readonly pptxExtractor: PptxExtractorService,
    private readonly csvParser: CsvParserService,
    private readonly markdownParser: MarkdownParserService,
    private readonly txtParser: TxtParserService,
  ) {}

  async parse(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<ParsedDocument> {
    const format = resolveDocumentFormat(originalName, mimeType);
    if (!format) this.throwUnsupported(originalName, mimeType);

    const parser = this.parsers.find(
      (candidate) => candidate.format === format,
    );
    if (!parser) this.throwUnsupported(originalName, mimeType);

    const parsed = await parser.parse(buffer);
    return { ...parsed, text: normalizeDocumentText(parsed.text) };
  }

  /**
   * Backwards-compatible string API used by existing PDF callers. New upload
   * code passes the filename too, enabling extension/MIME validation.
   */
  async extract(
    buffer: Buffer,
    mimeType: string,
    originalName?: string,
  ): Promise<string> {
    if (originalName) {
      return (await this.parse(buffer, originalName, mimeType)).text;
    }

    const format = resolveDocumentFormatByMime(mimeType);
    const parser = this.parsers.find(
      (candidate) => candidate.format === format,
    );
    if (!parser) this.throwUnsupported('', mimeType);
    const parsed = await parser.parse(buffer);
    return normalizeDocumentText(parsed.text);
  }

  private get parsers(): readonly DocumentParser[] {
    return [
      this.pdfExtractor,
      this.docxExtractor,
      this.xlsxExtractor,
      this.pptxExtractor,
      this.csvParser,
      this.markdownParser,
      this.txtParser,
    ];
  }

  private throwUnsupported(originalName: string, mimeType: string): never {
    const description = originalName
      ? `"${originalName}" (${mimeType || 'unknown MIME type'})`
      : `MIME type "${mimeType}"`;
    throw new UnsupportedMediaTypeException(
      `Unsupported document ${description}. Supported: PDF, DOCX, PPTX, XLSX, CSV, Markdown, TXT.`,
    );
  }
}
