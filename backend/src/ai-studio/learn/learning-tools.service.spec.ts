/* eslint-disable @typescript-eslint/unbound-method */
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import { FlashcardService } from './flashcard.service';
import { QuizService } from './quiz.service';
import { StudyGuideService } from './study-guide.service';

describe('Milestone 5 learning services', () => {
  const studio = {
    persistent: jest.fn().mockResolvedValue({ id: 'output' }),
  } as unknown as AiStudioService;
  beforeEach(() => jest.clearAllMocks());
  it('creates validated flashcard and quiz prompts with approved counts', async () => {
    await new FlashcardService(studio).generate('u1', {
      workspaceId: 'w1',
      count: 20,
      difficulty: 'hard',
    });
    expect(studio.persistent).toHaveBeenCalledWith(
      'u1',
      expect.anything(),
      AIOutputType.FLASHCARDS,
      'Flashcards',
      expect.stringContaining('exactly 20 hard'),
      { count: 20, difficulty: 'hard' },
    );
    await new QuizService(studio).generate('u1', {
      workspaceId: 'w1',
      questionCount: 5,
      difficulty: 'easy',
    });
    expect(studio.persistent).toHaveBeenCalledWith(
      'u1',
      expect.anything(),
      AIOutputType.QUIZ,
      'Quiz',
      expect.stringContaining('multiple-choice'),
      { questionCount: 5, difficulty: 'easy' },
    );
  });
  it('creates a persistent structured study guide', async () => {
    await new StudyGuideService(studio).generate('u1', { workspaceId: 'w1' });
    expect(studio.persistent).toHaveBeenCalledWith(
      'u1',
      expect.anything(),
      AIOutputType.STUDY_GUIDE,
      'Study Guide',
      expect.stringContaining('Learning Path'),
    );
  });
});
