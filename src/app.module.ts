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
import { ScheduleModule } from '@nestjs/schedule';
import { EmailRetryService } from './schedule/email-retry.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    AddressModule,
    ProductModule,
    OrderModule,
    MailModule,
    PaginationModule,
  ],
  providers: [EmailRetryService],
})
export class AppModule {}
