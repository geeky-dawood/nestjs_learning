import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AddressModule } from './address/address.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { MailModule } from './mail/mail.module';
import { PaginationModule } from './pagination/pagination.module';
import { TaskModule } from './task/task.module';
import { StripeModule } from './stripe/stripe.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    AddressModule,
    ProductModule,
    OrderModule,
    MailModule,
    PaginationModule,
    TaskModule,
    StripeModule,
    StripeModule,
    PaymentModule,
  ],
})
export class AppModule {}
