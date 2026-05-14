import { Injectable, Inject, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './constant/stripe.constants';
import { User } from '../generated/prisma/client';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  async createAndRetrieveCustomer(user: User): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    this.logger.log(
      `Stripe customer created: ${customer.id} (user: ${user.id})`,
    );

    return customer;
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(
      customerId,
    ) as Promise<Stripe.Customer>;
  }

  async createCheckoutSession(params: {
    customerId: string;
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.create(
      {
        customer: params.customerId,
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: params.currency,
              unit_amount: params.amount,
              product_data: {
                name: params.description,
                metadata: {
                  order_id: params.orderId,
                  payment_id: params.paymentId,
                },
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          payment_id: params.paymentId,
          order_id: params.orderId,
          user_id: params.userId,
        },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      },
      {
        idempotencyKey: `checkout-session-${params.paymentId}`,
      },
    );

    this.logger.log(
      `Checkout session created: ${session.id} for payment: ${params.paymentId}`,
    );
    return session;
  }

  async retrieveCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }
}
