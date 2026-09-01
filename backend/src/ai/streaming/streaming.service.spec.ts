/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { StreamingService } from './streaming.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { MetricsService } from '../../infrastructure/metrics.service';
import type { AiStreamEvent } from './streaming.service';

describe('StreamingService', () => {
  it('delivers increments then persists one completed message', async () => {
    async function* chunks() {
      await Promise.resolve();
      yield 'Hello';
      yield ' world';
    }
    const transaction = {
      chatMessage: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'm1', content: 'Hello world' }),
      },
      chatSession: { update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
      chatSession: { update: jest.fn() },
    } as unknown as PrismaService;
    const usage = { record: jest.fn() } as unknown as UsageService;
    const metrics = {
      aiStreamEvents: { inc: jest.fn() },
    } as unknown as MetricsService;
    const events: AiStreamEvent[] = [];
    for await (const event of new StreamingService(
      prisma,
      usage,
      metrics,
    ).complete({
      chunks: chunks(),
      conversationId: 'c1',
      userId: 'u1',
      provider: 'openai',
      model: 'gpt-test',
      input: 'Hi',
      sources: [],
      startedAt: Date.now(),
    }))
      events.push(event);
    expect(events.map((event) => event.type)).toEqual([
      'delta',
      'delta',
      'done',
    ]);
    expect(transaction.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'Hello world' }),
      }),
    );
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, streamed: true }),
    );
  });
});
