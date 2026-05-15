import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabass/supabass.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImageUploadService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadImage(file: Express.Multer.File, productId: string) {
    try {
      if (!file) {
        throw new BadRequestException('Image file is required.');
      }

      if (!productId) {
        throw new BadRequestException('Product ID is required.');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found.');
      }

      const maxFileSize =
        Number(this.configService.get<string>('MAX_FILE_SIZE')) ||
        10 * 1024 * 1024;

      const bucketName = this.configService.get<string>('SUPABASE_BUCKET');

      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];

      if (!bucketName) {
        throw new InternalServerErrorException(
          'Supabase bucket configuration missing.',
        );
      }

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Only PNG and JPEG images are allowed.');
      }

      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `Image size cannot exceed ${maxFileSize / (1024 * 1024)}MB.`,
        );
      }

      const nameParts = file.originalname.split('.');
      const fileExtension =
        nameParts.length > 1 ? nameParts.pop()?.toLowerCase() : 'png';

      const sanitizedName = nameParts.join('.').replace(/[^a-zA-Z0-9]/g, '-');

      const fileName = `products/${Date.now()}-${sanitizedName}.${fileExtension}`;

      const { error: uploadError } = await this.supabaseService.client.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw new BadRequestException(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = this.supabaseService.client.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      await this.prisma.product.update({
        where: { id: productId },
        data: {
          images: {
            push: publicUrl,
          },
        },
      });

      return {
        success: true,
        message: 'Image uploaded successfully.',
        data: {
          file_name: fileName,
          url: publicUrl,
          mime_type: file.mimetype,
          size: file.size,
        },
      };
    } catch (error) {
      console.error('Image upload failed:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to upload image.');
    }
  }
}
