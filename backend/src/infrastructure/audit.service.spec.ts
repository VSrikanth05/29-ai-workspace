/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { AuditService } from './audit.service';
describe('AuditService', () => {
  it('persists bounded production audit context without failing the request', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const service = new AuditService({ auditEvent: { create } } as any);
    await expect(
      service.record({
        action: 'preference.update',
        userId: 'u1',
        workspaceId: 'w1',
        ipAddress: '1.2.3.4',
        userAgent: 'agent',
        requestId: 'request',
        metadata: { resourceId: 'p1' },
      }),
    ).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'preference.update',
        userId: 'u1',
        workspaceId: 'w1',
      }),
    });
    create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      service.record({ action: 'auth.login' }),
    ).resolves.toBeUndefined();
  });
});
