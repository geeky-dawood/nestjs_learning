import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.constants';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';

@Global()
@Module({
  controllers: [StripeController],
  providers: [
    {
      provide: STRIPE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const stripeSecretKey =
          configService.getOrThrow<string>('STRIPE_SECRET_KEY');

        return new Stripe(stripeSecretKey, {
          apiVersion: '2026-03-25.dahlia',
          typescript: true,
          maxNetworkRetries: 3,
          timeout: 10000,
        });
      },
    },
    StripeService,
  ],
  exports: [StripeService],
})
export class StripeModule {}
