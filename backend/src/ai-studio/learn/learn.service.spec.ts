/* eslint-disable @typescript-eslint/unbound-method */
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import { LearnService } from './learn.service';
describe('LearnService', () => {
  it('routes detailed summaries to persistent SUMMARY outputs', async () => {
    const studio = {
      persistent: jest.fn().mockResolvedValue({}),
    } as unknown as AiStudioService;
    await new LearnService(studio).summary('u1', {
      workspaceId: 'w1',
      style: 'detailed',
    });
    expect(studio.persistent).toHaveBeenCalledWith(
      'u1',
      expect.anything(),
      AIOutputType.SUMMARY,
      'Detailed Summary',
      expect.stringContaining('comprehensive'),
      { style: 'detailed' },
    );
  });
});
