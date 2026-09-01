import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  it('handles mock mode when RESEND_API_KEY is unset', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new EmailService(config);

    expect(service.isConfigured).toBe(false);
    const result = await service.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Hello</p>',
    });
    expect(result.success).toBe(true);
    expect(result.id).toMatch(/^mock-/);
  });
});
