import { ImageTranslationOcrService } from './image-translation-ocr.service';

describe('ImageTranslationOcrService', () => {
  afterEach(() => jest.restoreAllMocks());
  it('normalizes OCR boxes and returns extracted text', async () => {
    const service = new ImageTranslationOcrService({ get: () => 'https://ocr.test/recognize' } as never);
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ language: 'eng_Latn', boxes: [{ text: 'Hello', bbox: [1, 2, 30, 12], confidence: 0.98 }], text: 'Hello' }), { status: 200 }));
    const result = await service.extract({ originalname: 'a.png', mimetype: 'image/png', buffer: Buffer.from('image') } as Express.Multer.File);
    expect(result).toMatchObject({ text: 'Hello', language: 'eng_Latn' });
    expect(result.boxes[0]).toMatchObject({ text: 'Hello', x: 1, y: 2, width: 30, height: 12, confidence: 0.98 });
  });
});
