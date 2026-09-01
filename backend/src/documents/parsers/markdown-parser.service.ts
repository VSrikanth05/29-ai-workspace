import { Injectable } from '@nestjs/common';
import {
  DocumentParser,
  ParsedDocument,
  normalizeDocumentText,
} from './document-parser';

@Injectable()
export class MarkdownParserService implements DocumentParser {
  readonly format = 'markdown' as const;

  parse(buffer: Buffer): ParsedDocument {
    return {
      text: normalizeDocumentText(buffer.toString('utf8')),
      metadata: { format: this.format },
    };
  }
}
