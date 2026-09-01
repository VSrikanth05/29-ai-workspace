/* eslint-disable @typescript-eslint/unbound-method */
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import { TranslationService } from './translation.service';
describe('TranslationService', () => {
  it('supports selected-text translation with formatting preservation', async () => {
    const studio = {
      persistent: jest.fn().mockResolvedValue({}),
    } as unknown as AiStudioService;
    await new TranslationService(studio).translate('u1', {
      workspaceId: 'w1',
      text: '# Heading',
      targetLanguage: 'Hindi',
    });
    expect(studio.persistent).toHaveBeenCalledWith(
      'u1',
      expect.anything(),
      AIOutputType.TRANSLATION,
      'Translation — Hindi',
      expect.stringMatching(/selected text.*Hindi.*Preserve Markdown/),
      expect.objectContaining({
        targetLanguage: 'Hindi',
        mode: 'selected text',
      }),
    );
  });
});
