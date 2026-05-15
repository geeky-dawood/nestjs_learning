import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUploadService } from './image-upload.service';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
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
