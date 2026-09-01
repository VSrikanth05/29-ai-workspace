/* eslint-disable @typescript-eslint/unbound-method */
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import { ReportService } from './report.service';
describe('ReportService', () => {
  it('requires the approved report sections and Markdown output', async () => {
    const studio = {
      persistent: jest.fn().mockResolvedValue({}),
    } as unknown as AiStudioService;
    await new ReportService(studio).generate('u1', {
      workspaceId: 'w1',
      style: 'executive',
    });
    expect(studio.persistent).toHaveBeenCalledWith(
      'u1',
      expect.anything(),
      AIOutputType.REPORT,
      'Executive Report',
      expect.stringMatching(/Executive Summary.*Action Items.*Conclusions/),
      expect.objectContaining({ style: 'executive', pdfExport: 'hook-only' }),
    );
  });
});
