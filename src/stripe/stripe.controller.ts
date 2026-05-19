import { Controller, Post, UseGuards } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { GetUser } from '../auth/decorator/user.decorator';
import * as client from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-customer')
  async createCustomer(@GetUser() user: client.User) {
    const customer = await this.stripeService.createAndRetrieveCustomer(user);
    return customer;
  }
}
