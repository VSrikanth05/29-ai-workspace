import { PromptEngineService } from './prompt-engine.service';

describe('PromptEngineService', () => {
  const service = new PromptEngineService();
  it('composes a versioned workspace and source prompt', () => {
    expect(
      service.compose({
        workspaceName: 'Research',
        sourceNames: ['paper.pdf'],
      }),
    ).toContain('Prompt version: ai-core-v1');
    expect(
      service.compose({
        workspaceName: 'Research',
        sourceNames: ['paper.pdf'],
      }),
    ).toContain('paper.pdf');
  });
  it('creates bounded conversation titles', () => {
    expect(service.conversationTitle('  A   useful question ')).toBe(
      'A useful question',
    );
    expect(service.conversationTitle('x'.repeat(100))).toHaveLength(64);
  });
});
