import { Injectable } from '@nestjs/common';
import {
  DocumentParser,
  ParsedDocument,
  normalizeDocumentText,
} from './document-parser';

@Injectable()
export class CsvParserService implements DocumentParser {
  readonly format = 'csv' as const;

  parse(buffer: Buffer): ParsedDocument {
    const text = normalizeDocumentText(buffer.toString('utf8'));
    return {
      text,
      metadata: {
        format: this.format,
        rowCount: text ? text.split('\n').length : 0,
      },
    };
  }
}
