import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('returns plans and generates mock orders when unconfigured', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new PaymentsService(config);

    expect(service.isConfigured).toBe(false);
    expect(service.getPlans().length).toBeGreaterThan(0);

    const order = await service.createOrder(
      { planId: 'pro', amount: 79900, currency: 'INR' },
      'user-1',
    );
    expect(order.id).toMatch(/^order_mock_/);
    expect(order.mock).toBe(true);

    const isValid = service.verifyPaymentSignature({
      razorpayOrderId: order.id,
      razorpayPaymentId: 'pay_123',
      razorpaySignature: 'sig_123',
    });
    expect(isValid).toBe(true);
  });
});
