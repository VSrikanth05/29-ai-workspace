import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImageTranslationBox, RenderResult } from './image-translation.types';

@Injectable()
export class ImageTranslationRendererService {
  constructor(private readonly config: ConfigService) {}

  async render(file: Express.Multer.File, boxes: ImageTranslationBox[], translatedTexts: string[]): Promise<RenderResult> {
    const endpoint = this.config.get<string>('IMAGE_TRANSLATION_RENDER_URL')?.trim();
    if (endpoint) return this.remote(endpoint, file, boxes, translatedTexts);
    if (file.mimetype === 'application/pdf') throw new BadRequestException('PDF rendering requires IMAGE_TRANSLATION_RENDER_URL.');
    const { width, height } = dimensions(file.buffer, file.mimetype);
    const image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const overlays = boxes.map((box, index) => {
      const text = translatedTexts[index] ?? '';
      const fontSize = Math.max(10, box.fontSize ?? Math.round(box.height * 0.68));
      const anchor = box.alignment === 'center' ? 'middle' : box.alignment === 'right' ? 'end' : 'start';
      const x = box.alignment === 'center' ? box.x + box.width / 2 : box.alignment === 'right' ? box.x + box.width : box.x;
      const lines = wrap(text, Math.max(1, box.width / (fontSize * 0.58)));
      return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${Math.max(1, fontSize / 5)}" fill="${safeColor(box.backgroundColor ?? '#ffffff')}" fill-opacity="0.96"/><text x="${x}" y="${box.y + fontSize}" text-anchor="${anchor}" fill="${safeColor(box.color ?? '#111827')}" font-family="Arial, sans-serif" font-size="${fontSize}">${lines.map((line, lineIndex) => `<tspan x="${x}" dy="${lineIndex ? fontSize * 1.15 : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" preserveAspectRatio="none" href="${image}"/>${overlays}</svg>`;
    return { bytes: Buffer.from(svg), mimeType: 'image/svg+xml' };
  }

  private async remote(endpoint: string, file: Express.Multer.File, boxes: ImageTranslationBox[], translatedTexts: string[]): Promise<RenderResult> {
    let response: Response;
    try {
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: file.buffer.toString('base64'), mimeType: file.mimetype, boxes, translatedTexts }), signal: AbortSignal.timeout(120_000) });
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'Renderer request failed.');
    }
    if (!response.ok) throw new BadGatewayException(`Renderer service failed (${response.status}).`);
    const payload = (await response.json()) as { imageBase64?: string; mimeType?: string };
    if (!payload.imageBase64) throw new BadGatewayException('Renderer returned no image.');
    return { bytes: Buffer.from(payload.imageBase64, 'base64'), mimeType: payload.mimeType ?? 'image/png' };
  }
}

function dimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png' && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (mimeType === 'image/webp' && buffer.subarray(12, 16).toString('ascii') === 'VP8X' && buffer.length >= 30) return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      offset += 2 + length;
    }
  }
  throw new BadRequestException('Could not determine image dimensions.');
}
function wrap(value: string, maxChars: number) { const words = value.split(/\s+/); const lines: string[] = []; let line = ''; for (const word of words) { if (line && line.length + word.length + 1 > maxChars) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word; } if (line) lines.push(line); return lines.slice(0, 8); }
function escapeXml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char); }
function safeColor(value: string) { return /^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|rgba|hsl|hsla)\([^)]*\)$/.test(value) ? value : '#ffffff'; }
