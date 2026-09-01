import { Injectable } from '@nestjs/common';
import JSZip from 'jszip';
import { DocumentParser, ParsedDocument } from '../parsers/document-parser';

@Injectable()
export class PptxExtractorService implements DocumentParser {
  readonly format = 'pptx' as const;

  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const zip = await JSZip.loadAsync(buffer);

    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] ?? '0', 10);
        const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] ?? '0', 10);
        return numA - numB;
      });

    const slideTexts: string[] = [];

    for (const fileName of slideFiles) {
      const xml = await zip.files[fileName].async('text');
      // Pull text out of <a:t>...</a:t> runs, which is where PowerPoint stores
      // visible text regardless of shape/placeholder type.
      const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/gs)];
      const text = matches
        .map((m) =>
          m[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>'),
        )
        .join(' ');

      if (text.trim()) {
        slideTexts.push(
          `## Slide ${slideFiles.indexOf(fileName) + 1}\n${text.trim()}`,
        );
      }
    }

    return {
      text: slideTexts.join('\n\n').trim(),
      metadata: { format: this.format, slideCount: slideFiles.length },
    };
  }
}
