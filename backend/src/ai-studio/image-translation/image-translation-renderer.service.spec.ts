import { ImageTranslationRendererService } from './image-translation-renderer.service';

describe('ImageTranslationRendererService', () => {
  it('masks OCR boxes and renders translated text while retaining the source image', async () => {
    const service = new ImageTranslationRendererService({ get: () => undefined } as never);
    const file = { buffer: Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,100,0,0,0,40]), mimetype: 'image/png' } as Express.Multer.File;
    const result = await service.render(file, [{ text: 'Hello', x: 10, y: 4, width: 80, height: 16 }], ['Hola']);
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.bytes.toString()).toContain('Hola');
    expect(result.bytes.toString()).toContain('width="80" height="16"');
    expect(result.bytes.toString()).toContain('data:image/png;base64');
  });
});
