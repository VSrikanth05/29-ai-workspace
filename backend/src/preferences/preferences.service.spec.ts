/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { WorkspaceRole } from '@prisma/client';
import { PreferencesService } from './preferences.service';
describe('PreferencesService', () => {
  it('persists preferences per workspace and requires editor access', async () => {
    const prisma: any = {
      workspacePreference: {
        upsert: jest
          .fn()
          .mockResolvedValue({ workspaceId: 'w1', theme: 'dark' }),
      },
    };
    const access: any = { requireRole: jest.fn() };
    const config: any = { get: jest.fn().mockReturnValue('nvidia') };
    const result = await new PreferencesService(prisma, access, config).update('u1', {
      workspaceId: 'w1',
      theme: 'dark',
    });
    expect(access.requireRole).toHaveBeenCalledWith(
      'w1',
      'u1',
      WorkspaceRole.EDITOR,
    );
    expect(prisma.workspacePreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'w1' },
        update: { theme: 'dark' },
      }),
    );
    expect(result.theme).toBe('dark');
  });
});
