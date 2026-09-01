import { Injectable } from '@nestjs/common';

@Injectable()
export class TextChunkerService {
  chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!normalizedText) {
      return [];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < normalizedText.length) {
      const end = Math.min(start + chunkSize, normalizedText.length);

      const chunk = normalizedText.slice(start, end).trim();

      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      if (end === normalizedText.length) {
        break;
      }

      start = end - overlap;
    }

    return chunks;
  }
}
