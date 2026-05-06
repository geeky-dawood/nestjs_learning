import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaginationService } from './pagination.service';

@Module({
  imports: [PrismaModule],
  providers: [PaginationService],
  exports: [PaginationService],
})
export class PaginationModule {}
