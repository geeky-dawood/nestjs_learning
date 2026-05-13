import {
  Injectable,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.constants';
import { PaymentEventType, User } from '../generated/prisma/browser';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
  ) {}

  async createCustomer(user: User) {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          stripe_customer_id: customer.id,
        },
      });

      return customer;
    } catch (error) {
      throw error;
    }
  }

  async createPaymentIntent(
    user: User,
    body: { amount: number; orderId: string },
  ) {
    if (!user.stripe_customer_id) {
      throw new UnprocessableEntityException(
        'User does not have a Stripe customer ID',
      );
    }
    try {
      const orderId = body.orderId || `order_${Date.now()}`;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: body.amount,
        currency: 'usd',
        payment_method_types: ['card'],
        customer: user.stripe_customer_id,
        metadata: {
          integration_check: 'accept_a_payment',
          userId: user.id,
          orderId: orderId,
        },
      });

      await this.prisma.payment.create({
        data: {
          order_id: orderId,
          amount: body.amount,
          currency: 'usd',
          user_id: user.id,
          description: `Payment for order ${orderId}`,
        },
      });

      await this.prisma.paymentActivityLogs.create({
        data: {
          payment_id: paymentIntent.id,
          order_id: orderId,
          user_id: user.id,
          event_type: PaymentEventType.PAYMENT_INTENT_CREATED,
          description: `Payment intent created for order ${orderId} with amount ${body.amount}`,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw error;
    }
  }
}
