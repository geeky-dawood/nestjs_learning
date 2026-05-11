import { Module } from '@nestjs/common';
import { ImageUploadService } from './image-upload.service';
import { ImageUploadController } from './image-upload.controller';
import { SupabaseModule } from '../supabass/supabass.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [SupabaseModule],
  providers: [ImageUploadService, PrismaService],
  exports: [ImageUploadService],
  controllers: [ImageUploadController],
})
export class ImageUploadModule {}
