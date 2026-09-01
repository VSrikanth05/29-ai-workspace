import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { DocumentParser, ParsedDocument } from '../parsers/document-parser';

@Injectable()
export class PdfExtractorService implements DocumentParser {
  readonly format = 'pdf' as const;

  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return {
        text: result.text,
        metadata: { format: this.format, pageCount: result.total },
      };
    } finally {
      await parser.destroy();
    }
  }
}
