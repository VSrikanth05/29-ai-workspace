import { ImageTranslationTranslationService } from './image-translation-translation.service';

describe('ImageTranslationTranslationService', () => {
  afterEach(() => jest.restoreAllMocks());
  it('calls NLLB with source and target language codes and preserves box order', async () => {
    const service = new ImageTranslationTranslationService({ get: (key: string) => key === 'HUGGINGFACE_API_TOKEN' ? 'test-token' : undefined } as never);
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify([{ translation_text: 'Hola' }, { translation_text: 'Mundo' }]), { status: 200 }));
    const result = await service.translate(['Hello', 'World'], 'English', 'Spanish');
    expect(result).toEqual(['Hola', 'Mundo']);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('facebook/nllb-200-distilled-600M'), expect.objectContaining({ body: expect.stringContaining('eng_Latn') }));
    expect((fetch as jest.Mock).mock.calls[0][1].body).toContain('spa_Latn');
  });
});
