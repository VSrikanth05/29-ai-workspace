import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { DocumentParser, ParsedDocument } from '../parsers/document-parser';

@Injectable()
export class DocxExtractorService implements DocumentParser {
  readonly format = 'docx' as const;

  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      metadata: {
        format: this.format,
        warningCount: result.messages.length,
      },
    };
  }
}
