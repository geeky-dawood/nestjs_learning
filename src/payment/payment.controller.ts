import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { GetUser } from '../auth/decorator/user.decorator';
import { PaymentService } from './payment.service';
import * as client from '../generated/prisma/client';
import { CreateCheckoutSessionDto } from '../dto/checkout session.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  createCheckoutSession(
    @GetUser() user: client.User,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentService.createCheckoutSession(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  getPaymentStatus(
    @Param('id') paymentId: string,
    @GetUser('id') userId: string,
  ) {
    return this.paymentService.getPaymentStatus(paymentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/logs')
  getPaymentLogs(
    @Param('id') paymentId: string,
    @GetUser('id') userId: string,
  ) {
    return this.paymentService.getPaymentLogs(paymentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sync')
  syncStatus(
    @Query('session_id') sessionId: string,
    @GetUser('id') userId: string,
  ) {
    return this.paymentService.syncSessionStatus(sessionId, userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Req() req, @Headers('stripe-signature') signature: string) {
    console.log('Received Stripe webhook:', {
      headers: req.headers,
      body: req.body,
    });
    if (!req.rawBody) {
      throw new Error(
        'rawBody not available. Set { rawBody: true } in NestFactory.create(AppModule, { rawBody: true })',
      );
    }

    return this.paymentService.handleWebhook(req.rawBody, signature);
  }
}
