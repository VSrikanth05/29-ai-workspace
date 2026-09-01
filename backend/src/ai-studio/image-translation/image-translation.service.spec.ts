import { ImageTranslationService } from './image-translation.service';

describe('ImageTranslationService pipeline', () => {
  it('runs OCR, translation, rendering, storage, and persistence in order', async () => {
    const prisma = {
      imageTranslation: { create: jest.fn().mockResolvedValue({ id: 'it-1' }), update: jest.fn().mockResolvedValue({ id: 'it-1', originalName: 'a.png', mimeType: 'image/png', size: 24, status: 'COMPLETED', sourceLanguage: 'eng_Latn', targetLanguage: 'spa_Latn', extractedText: 'Hello', translatedText: 'Hola', ocrBoxes: [], translatedMimeType: 'image/svg+xml', error: null, originalStoragePath: 'original', translatedStoragePath: 'translated', workspaceId: 'w1', createdAt: new Date(), updatedAt: new Date() }) },
    };
    const storage = { upload: jest.fn().mockResolvedValue('path'), getSignedUrl: jest.fn().mockResolvedValue('https://storage.test/signed') };
    const access = { requireRole: jest.fn().mockResolvedValue(undefined) };
    const ocr = { extract: jest.fn().mockResolvedValue({ text: 'Hello', boxes: [{ text: 'Hello', x: 1, y: 1, width: 20, height: 10 }] }) };
    const translation = { translate: jest.fn().mockResolvedValue(['Hola']) };
    const renderer = { render: jest.fn().mockResolvedValue({ bytes: Buffer.from('svg'), mimeType: 'image/svg+xml' }) };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new ImageTranslationService(prisma as never, access as never, ocr as never, translation as never, renderer as never, config as never, storage as never);
    const result = await service.translate('u1', { originalname: 'a.png', mimetype: 'image/png', size: 24, buffer: Buffer.from([137,80,78,71,13,10,26,10]) } as Express.Multer.File, { workspaceId: 'w1', targetLanguage: 'Spanish' });
    expect(ocr.extract).toHaveBeenCalled();
    expect(translation.translate).toHaveBeenCalledWith(['Hello'], 'eng_Latn', 'spa_Latn');
    expect(renderer.render).toHaveBeenCalledWith(expect.anything(), expect.anything(), ['Hola']);
    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ translatedUrl: 'https://storage.test/signed', translatedText: 'Hola' });
  });
});
