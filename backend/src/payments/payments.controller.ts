import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsService, CreateOrderDto, VerifyPaymentDto } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('plans')
  getPlans() {
    return {
      plans: this.payments.getPlans(),
      keyId: this.payments.getKeyId(),
      configured: this.payments.isConfigured,
    };
  }

  @Post('create-order')
  async createOrder(@Body() body: CreateOrderDto, @Req() req: any) {
    const userId = req.user?.id || 'guest-user';
    return this.payments.createOrder(body, userId);
  }

  @Post('verify')
  async verifyPayment(@Body() body: VerifyPaymentDto) {
    const isValid = this.payments.verifyPaymentSignature(body);
    if (!isValid) {
      throw new UnauthorizedException('Invalid payment signature');
    }
    return { success: true, status: 'paid', orderId: body.razorpayOrderId };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const isValid = this.payments.verifyWebhookSignature(
      typeof body === 'string' ? body : JSON.stringify(body),
      signature,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return { received: true };
  }
}
