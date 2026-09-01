import { Injectable } from '@nestjs/common';
import {
  DocumentParser,
  ParsedDocument,
  normalizeDocumentText,
} from './document-parser';

@Injectable()
export class TxtParserService implements DocumentParser {
  readonly format = 'txt' as const;

  parse(buffer: Buffer): ParsedDocument {
    return {
      text: normalizeDocumentText(buffer.toString('utf8')),
      metadata: { format: this.format },
    };
  }
}
