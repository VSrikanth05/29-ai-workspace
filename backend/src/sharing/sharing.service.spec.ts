/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { GoneException } from '@nestjs/common';
import { SharingService } from './sharing.service';
describe('SharingService', () => {
  it('stores only a hash and returns the raw token only inside the URL', async () => {
    const prisma: any = {
      shareLink: {
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'share-1', ...data })),
      },
    };
    const targets: any = {
      validate: jest.fn().mockResolvedValue({ outputId: 'o1' }),
    };
    const service = new SharingService(
      prisma,
      targets,
      {} as any,
      { get: () => 'https://workspace.test' } as any,
    );
    const result = await service.create('u1', {
      workspaceId: 'w1',
      outputId: 'o1',
    });
    const stored = prisma.shareLink.create.mock.calls[0][0].data.tokenHash;
    expect(stored).toMatch(/^[a-f0-9]{64}$/);
    expect(result.url).toMatch(/^https:\/\/workspace\.test\/shared\//);
    expect(result.url).not.toContain(stored);
  });
  it('rejects expired links without exposing content', async () => {
    const prisma: any = {
      shareLink: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ expiresAt: new Date(0), revokedAt: null }),
      },
    };
    const service = new SharingService(
      prisma,
      {} as any,
      {} as any,
      { get: jest.fn() } as any,
    );
    await expect(service.view('token')).rejects.toBeInstanceOf(GoneException);
  });
});
