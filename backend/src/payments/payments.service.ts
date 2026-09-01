import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export class CreateOrderDto {
  planId!: string;
  amount!: number;
  currency?: string;
  workspaceId?: string;
}

export class VerifyPaymentDto {
  razorpayOrderId!: string;
  razorpayPaymentId!: string;
  razorpaySignature!: string;
}

export interface PlanInfo {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing: 'monthly' | 'yearly';
  features: string[];
  recommended?: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly keyId?: string;
  private readonly keySecret?: string;
  private readonly webhookSecret?: string;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID')?.trim();
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim();
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')?.trim();
  }

  get isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  getKeyId(): string {
    return this.keyId || 'rzp_test_mock_key_29ai';
  }

  getPlans(): PlanInfo[] {
    return [
      {
        id: 'free',
        name: 'Starter',
        price: 0,
        currency: 'INR',
        billing: 'monthly',
        features: [
          'Unlimited Grounded AI Chat (Gemini / NVIDIA NIM)',
          'Up to 20 Sources per Workspace',
          'AI Studio Deliverables & Flashcards',
          'Standard Image & Audio Generation',
          'Universal Search & History',
        ],
      },
      {
        id: 'pro',
        name: 'Pro Workspace',
        price: 799,
        currency: 'INR',
        billing: 'monthly',
        recommended: true,
        features: [
          'Everything in Starter',
          'Unlimited Sources & Storage (Cloudflare R2)',
          'Priority LLM Routing & Failover',
          'High-Res Image Studio & Video Sequences',
          'Team Collaboration & Read-Only Sharing',
          'Export to Markdown, PDF, CSV & JSON',
        ],
      },
      {
        id: 'team',
        name: 'Enterprise / Team',
        price: 2499,
        currency: 'INR',
        billing: 'monthly',
        features: [
          'Everything in Pro',
          'Dedicated Supabase DB & Custom Retention',
          'Custom Brand Theme & Custom Domain',
          'Audit Logs & SLA Support',
          'Custom LLM Fine-Tuned Grounding',
        ],
      },
    ];
  }

  async createOrder(dto: CreateOrderDto, userId: string) {
    const currency = dto.currency || 'INR';
    const amount = dto.amount;

    if (!this.isConfigured) {
      this.logger.log(
        '[Razorpay Mock] Creating order for user ' + userId + ' - Plan: ' + dto.planId + ', Amount: ' + amount + ' ' + currency,
      );
      return {
        id: 'order_mock_' + Date.now(),
        amount,
        currency,
        keyId: this.getKeyId(),
        planId: dto.planId,
        mock: true,
      };
    }

    try {
      const auth = Buffer.from(this.keyId + ':' + this.keySecret).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: 'rcpt_' + userId.slice(0, 8) + '_' + Date.now(),
          notes: {
            userId,
            planId: dto.planId,
            workspaceId: dto.workspaceId || '',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Razorpay Order creation failed: ' + errorText);
        throw new BadRequestException('Failed to create Razorpay order: ' + errorText);
      }

      const order = await response.json();
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: this.getKeyId(),
        planId: dto.planId,
        mock: false,
      };
    } catch (err: any) {
      this.logger.error('Razorpay Order error: ' + err.message);
      throw new BadRequestException(err.message);
    }
  }

  verifyPaymentSignature(dto: VerifyPaymentDto): boolean {
    if (!this.isConfigured) {
      return dto.razorpayOrderId.startsWith('order_mock_');
    }

    const payload = dto.razorpayOrderId + '|' + dto.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret!)
      .update(payload)
      .digest('hex');

    const isValid = expectedSignature === dto.razorpaySignature;
    if (!isValid) {
      this.logger.warn('Payment signature mismatch for order ' + dto.razorpayOrderId);
    }
    return isValid;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return true;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  }
}
