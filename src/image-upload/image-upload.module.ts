import { Module } from '@nestjs/common';
import { ImageUploadService } from './image-upload.service';
import { ImageUploadController } from './image-upload.controller';
import { SupabaseModule } from '../supabass/supabass.module';

@Module({
  imports: [SupabaseModule],
  providers: [ImageUploadService],
  exports: [ImageUploadService],
  controllers: [ImageUploadController],
})
export class ImageUploadModule {}
