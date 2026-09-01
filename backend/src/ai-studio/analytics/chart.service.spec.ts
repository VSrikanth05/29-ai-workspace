/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import { AnalyticsEngineService } from './analytics-engine.service';
import { ChartService } from './chart.service';

describe('ChartService', () => {
  it.each(['bar', 'line', 'pie', 'scatter', 'histogram', 'area'] as const)(
    'persists a %s chart with source data',
    async (chartType) => {
      const studio = {
        analyticsSource: jest.fn().mockResolvedValue({
          originalName: 'sales.csv',
          extractedText: 'month,sales\nJan,10\nFeb,20\nMar,30',
        }),
        persistComputed: jest
          .fn()
          .mockImplementation((...args: unknown[]) => Promise.resolve(args[4])),
      } as unknown as AiStudioService;
      const result = await new ChartService(
        studio,
        new AnalyticsEngineService(),
      ).generate('u1', { workspaceId: 'w1', sourceId: 'd1', chartType });
      expect(studio.persistComputed).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ sourceIds: ['d1'] }),
        AIOutputType.CHART,
        expect.any(String),
        expect.objectContaining({
          format: 'chart',
          chartType,
          data: expect.any(Array),
        }),
        expect.anything(),
      );
      expect(result).toMatchObject({ format: 'chart', chartType });
    },
  );
});
