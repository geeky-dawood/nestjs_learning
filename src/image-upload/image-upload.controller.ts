import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUploadService } from './image-upload.service';

@Controller('image-upload')
export class ImageUploadController {
  constructor(private readonly imageUploadService: ImageUploadService) {}

  @Post('upload/:productId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.imageUploadService.uploadImage(file, productId);
  }
}
